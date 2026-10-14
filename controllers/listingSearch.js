const Listing = require("../models/listing");
const {
  searchQuerySchema,
  aiSearchFiltersSchema,
} = require("../schema.js");
const {
  extractListingFilters,
  SearchConfigurationError,
} = require("../services/aiSearch.js");

function renderSearchPage(res, options) {
  return res.render("./listings/index.ejs", {
    allListings: [],
    searchQuery: "",
    searchFilters: null,
    searchUnsupportedCriteria: [],
    searchExecuted: false,
    searchMatchNote: null,
    searchError: null,
    ...options,
  });
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildListingQuery(filters) {
  const mongoQuery = {};

  if (filters.location) {
    mongoQuery.location = {
      $regex: escapeRegex(filters.location),
      $options: "i",
    };
  }

  if (filters.country) {
    mongoQuery.country = {
      $regex: `^${escapeRegex(filters.country)}$`,
      $options: "i",
    };
  }

  if (filters.minPrice !== null || filters.maxPrice !== null) {
    mongoQuery.price = {};
    if (filters.minPrice !== null) mongoQuery.price.$gte = filters.minPrice;
    if (filters.maxPrice !== null) mongoQuery.price.$lte = filters.maxPrice;
  }

  return mongoQuery;
}

const keywordSynonymGroups = [
  ["pool", "swimming pool"],
  ["wifi", "wi fi", "internet", "wireless internet"],
  ["beach", "beachfront", "seaside", "shore"],
  ["sea view", "ocean view", "water view"],
  ["air conditioning", "aircon", "ac"],
  ["parking", "car park"],
  ["pet friendly", "pets allowed", "pets welcome"],
  ["garden", "yard", "backyard"],
  ["mountain", "hills", "hill view"],
  ["balcony", "terrace"],
  ["hot tub", "jacuzzi"],
  ["family friendly", "kid friendly", "child friendly"],
  ["luxury", "luxurious", "premium", "upscale"],
];

function normalizeSearchText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function normalizeSearchTokens(value) {
  return normalizeSearchText(value)
    .split(" ")
    .filter(Boolean)
    .map((token) => {
      if (token.length > 4 && token.endsWith("ies")) {
        return `${token.slice(0, -3)}y`;
      }
      if (
        token.length > 4 &&
        ["ches", "shes", "xes", "zes", "sses"].some((ending) => token.endsWith(ending))
      ) {
        return token.slice(0, -2);
      }
      if (token.length > 3 && token.endsWith("s") && !token.endsWith("ss")) {
        return token.slice(0, -1);
      }
      return token;
    });
}

function getKeywordVariants(keyword) {
  const normalizedKeyword = normalizeSearchText(keyword);
  const synonymGroup = keywordSynonymGroups.find((group) =>
    group.some((term) => normalizeSearchText(term) === normalizedKeyword),
  );

  return (synonymGroup || [keyword]).map(normalizeSearchTokens).filter((tokens) => tokens.length);
}

function containsTokenSequence(textTokens, sequence) {
  return textTokens.some((_, start) =>
    sequence.every((token, offset) => textTokens[start + offset] === token),
  );
}

function scoreListing(listing, keywords) {
  const listingText = normalizeSearchTokens(`${listing.title || ""} ${listing.description || ""}`);
  let matchedKeywords = 0;

  for (const keyword of keywords) {
    const variants = getKeywordVariants(keyword);
    if (variants.some((variant) => containsTokenSequence(listingText, variant))) {
      matchedKeywords += 1;
    }
  }

  return matchedKeywords;
}

function rankListings(listings, keywords, canBroaden) {
  if (!keywords.length) return { listings, note: null };

  const rankedListings = listings
    .map((listing) => ({ listing, score: scoreListing(listing, keywords) }))
    .sort((a, b) => b.score - a.score);
  const fullyMatched = rankedListings.filter(({ score }) => score === keywords.length);

  if (fullyMatched.length) {
    return { listings: fullyMatched.map(({ listing }) => listing), note: null };
  }

  const partiallyMatched = rankedListings.filter(({ score }) => score > 0);
  if (partiallyMatched.length) {
    return {
      listings: partiallyMatched.map(({ listing }) => listing),
      note: "No listing matched every detail, so these results match at least one requested detail and are ranked by relevance.",
    };
  }

  if (canBroaden && listings.length) {
    return {
      listings,
      note: "No listing text clearly matched those details. Showing listings that match the destination, country, or budget instead.",
    };
  }

  return { listings: [], note: null };
}

function getSearchErrorMessage(error) {
  const errorCode = error.code || "";
  const errorType = error.type || "";

  if (error.status === 429) {
    if (
      errorCode === "insufficient_quota" ||
      errorType === "insufficient_quota" ||
      errorCode.includes("credit_balance") ||
      errorCode.includes("spend_limit") ||
      errorCode.includes("usage_limit")
    ) {
      return "Gemini reports that this API project has reached a usage limit. Check its quota in Google AI Studio, then try again.";
    }

    if (errorCode === "rate_limit_exceeded") {
      return "Gemini's request rate limit was reached. Wait briefly before trying again.";
    }

    return "Gemini returned a 429 limit response. Check this API project's quota and model rate limits.";
  }

  if (error.status === 401 || errorCode === "invalid_api_key") {
    return "Gemini rejected the API key. Check GEMINI_API_KEY in your local .env file, then restart the server.";
  }

  if (error.status === 403) {
    return "This API key or project may not have permission to use the selected model. Check the project's model access.";
  }

  if (error.status === 404 || errorCode === "model_not_found") {
    return "The configured Gemini model was not found or is unavailable to this project. Check GEMINI_MODEL.";
  }

  if (error instanceof SyntaxError || error.message === "AI search filters did not pass validation") {
    return "Gemini returned search filters this app could not validate. Try a simpler search.";
  }

  return "AI search is temporarily unavailable. Please try again in a moment.";
}

module.exports.search = async (req, res) => {
  const input = searchQuerySchema.validate(req.body, { abortEarly: false });
  if (input.error) {
    return renderSearchPage(res, {
      searchQuery: typeof req.body?.query === "string" ? req.body.query : "",
      searchError: "Enter a search of 2 to 300 characters.",
    });
  }

  const searchQuery = input.value.query;
  let filters;

  try {
    const extractedFilters = await extractListingFilters(searchQuery);
    const validatedFilters = aiSearchFiltersSchema.validate(extractedFilters, {
      abortEarly: false,
      convert: false,
    });

    if (validatedFilters.error) {
      throw new Error("AI search filters did not pass validation");
    }

    filters = validatedFilters.value;
  } catch (error) {
    if (error instanceof SearchConfigurationError) {
      return renderSearchPage(res, {
        searchQuery,
        searchError:
          "AI search is not configured yet. Add GEMINI_API_KEY and GEMINI_MODEL to the server environment.",
      });
    }

    console.error("AI listing search failed", {
      name: error.name,
      status: error.status ?? null,
      code: error.code ?? null,
      type: error.type ?? null,
      requestID: error.requestID ?? null,
    });
    return renderSearchPage(res, {
      searchQuery,
      searchError: getSearchErrorMessage(error),
    });
  }

  if (
    filters.minPrice !== null &&
    filters.maxPrice !== null &&
    filters.minPrice > filters.maxPrice
  ) {
    return renderSearchPage(res, {
      searchQuery,
      searchFilters: filters,
      searchError: "I couldn't interpret a valid price range. Try rephrasing it.",
    });
  }

  const hasSupportedFilter = Boolean(
    filters.location ||
      filters.country ||
      filters.minPrice !== null ||
      filters.maxPrice !== null ||
      filters.sortBy !== null ||
      filters.keywords.length,
  );

  if (!hasSupportedFilter) {
    return renderSearchPage(res, {
      searchQuery,
      searchFilters: filters,
      searchUnsupportedCriteria: filters.unsupportedCriteria,
      searchError:
        "I couldn't find a location, budget, or listing detail to search. Try adding one of those.",
    });
  }

  const candidateListings = await Listing.find(buildListingQuery(filters));
  const canBroaden = Boolean(
    filters.location ||
      filters.country ||
      filters.minPrice !== null ||
      filters.maxPrice !== null,
  );
  const { listings: allListings, note: searchMatchNote } = rankListings(
    candidateListings,
    filters.keywords,
    canBroaden,
  );

  if (filters.sortBy === "price_asc") {
    allListings.sort((a, b) => a.price - b.price);
  } else if (filters.sortBy === "price_desc") {
    allListings.sort((a, b) => b.price - a.price);
  }

  return renderSearchPage(res, {
    allListings,
    searchQuery,
    searchFilters: filters,
    searchUnsupportedCriteria: filters.unsupportedCriteria,
    searchExecuted: true,
    searchMatchNote,
  });
};

module.exports.renderSearchPage = renderSearchPage;
