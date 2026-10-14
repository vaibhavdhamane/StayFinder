const Joi = require("joi");

module.exports.listingSchema = Joi.object({
  listing: Joi.object({
    title: Joi.string().required(),
    description: Joi.string().required(),
    location: Joi.string().required(),
    country: Joi.string().required(),
    price: Joi.number().min(0).required(),

    image: Joi.object({
      url: Joi.string().uri().allow("", null)
    })
  }).required()
});

module.exports.reviewSchema = Joi.object({
  review : Joi.object({
     rating : Joi.number().required().min(1).max(5),
     comment : Joi.string().required(),
  }).required(),
})

module.exports.searchQuerySchema = Joi.object({
  query: Joi.string().trim().min(2).max(300).required(),
});

module.exports.aiSearchFiltersSchema = Joi.object({
  location: Joi.string().trim().max(100).allow(null).required(),
  country: Joi.string().trim().max(100).allow(null).required(),
  minPrice: Joi.number().min(0).max(10000000).allow(null).required(),
  maxPrice: Joi.number().min(0).max(10000000).allow(null).required(),
  sortBy: Joi.string().valid("price_asc", "price_desc").allow(null).required(),
  keywords: Joi.array()
    .items(Joi.string().trim().min(1).max(60))
    .max(8)
    .required(),
  unsupportedCriteria: Joi.array()
    .items(Joi.string().trim().min(1).max(100))
    .max(5)
    .required(),
});

module.exports.aiDescriptionRequestSchema = Joi.object({
  description: Joi.string().trim().min(3).max(3000).required(),
});
