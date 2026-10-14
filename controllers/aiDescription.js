const { aiDescriptionRequestSchema } = require("../schema.js");
const {
  refineListingDescription,
  DescriptionConfigurationError,
} = require("../services/aiDescription.js");

module.exports.refine = async (req, res) => {
  const input = aiDescriptionRequestSchema.validate(req.body, {
    abortEarly: false,
  });

  if (input.error) {
    return res.status(400).json({
      error: "Enter a description of up to 3000 characters, then try again.",
    });
  }

  const wordCount = input.value.description.split(/\s+/).filter(Boolean).length;
  if (wordCount < 8) {
    return res.status(400).json({
      error: "Write at least 8 words before asking AI to refine the description.",
    });
  }

  try {
    const refinedDescription = await refineListingDescription(input.value.description);
    return res.json({ refinedDescription });
  } catch (error) {
    if (error instanceof DescriptionConfigurationError) {
      return res.status(503).json({
        error: "AI refinement is not configured. Check GEMINI_API_KEY and GEMINI_MODEL on the server.",
      });
    }

    console.error("AI listing description refinement failed", {
      name: error.name,
      status: error.status ?? null,
      code: error.code ?? null,
    });

    if (error.status === 429) {
      return res.status(429).json({
        error: "Gemini's usage limit was reached. Please wait and try again.",
      });
    }

    return res.status(502).json({
      error: "AI refinement is temporarily unavailable. Your draft has not been changed.",
    });
  }
};
