const express = require("express");
const router = express.Router();
const wrapAsync = require("../utils/wrapAsync.js");
const Listing = require("../models/listing.js");
const { isLoggedIn, isOwner, validateListing } = require("../middleware.js");

const listingController = require("../controllers/listings.js");
const listingSearchController = require("../controllers/listingSearch.js");
const aiDescriptionController = require("../controllers/aiDescription.js");
const { rateLimit } = require("express-rate-limit");

const multer  = require('multer')
const {storage} = require("../CloudConfig.js") ;
const upload = multer({storage });

const aiSearchLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 20,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    handler: (req, res) => {
        listingSearchController.renderSearchPage(res.status(429), {
            searchQuery: typeof req.body?.query === "string" ? req.body.query : "",
            searchError: "Too many searches in a short time. Please wait a few minutes and try again.",
        });
    },
});

const aiDescriptionLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    handler: (req, res) => res.status(429).json({
        error: "Too many AI refinements in a short time. Please wait and try again.",
    }),
});

router.route("/")
    .get(wrapAsync(listingController.index))
    .post(isLoggedIn,
        upload.single("listing[image]"),
        validateListing,
         wrapAsync(listingController.createListing));
    

//New route 
router.get("/new", isLoggedIn, listingController.renderNewForm);

router.post(
    "/ai-refine-description",
    isLoggedIn,
    aiDescriptionLimiter,
    wrapAsync(aiDescriptionController.refine),
);

router.post(
    "/ai-search",
    aiSearchLimiter,
    wrapAsync(listingSearchController.search)
);


router.route("/:id")
    .get(wrapAsync(listingController.showListing))
    .put(isLoggedIn, isOwner, upload.single("listing[image]"),
        validateListing, wrapAsync(listingController.updateListing))
    .delete(isLoggedIn, isOwner,
        wrapAsync(listingController.destroyListing));


//Edit Route 
router.get("/:id/edit", isLoggedIn,
    isOwner, wrapAsync(listingController.editListing));


module.exports = router;
