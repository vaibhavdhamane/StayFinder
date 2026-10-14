require("dotenv").config();

const mongoose = require("mongoose");
const mbxGeocoding = require("@mapbox/mapbox-sdk/services/geocoding");
const initData = require("./data.js");
const Listing = require("../models/listing.js");
const User = require("../models/users.js");

const MONGO_URL =
  process.env.ATLASDB_URL || "mongodb://127.0.0.1:27017/stayfinder";

async function seedListings() {
  if (!process.env.SEED_OWNER_ID) {
    throw new Error("Set SEED_OWNER_ID to the MongoDB ID of your local user.");
  }

  if (!process.env.MAP_TOKEN) {
    throw new Error("Set MAP_TOKEN before seeding; sample locations need geocoding.");
  }

  await mongoose.connect(MONGO_URL);

  const owner = await User.findById(process.env.SEED_OWNER_ID);
  if (!owner) {
    throw new Error("SEED_OWNER_ID does not match a user in the configured database.");
  }

  const geocodingClient = mbxGeocoding({ accessToken: process.env.MAP_TOKEN });
  const geocodedLocations = new Map();
  let addedListings = 0;

  for (const sample of initData.data) {
    const filter = {
      title: sample.title,
      location: sample.location,
      country: sample.country,
      owner: owner._id,
    };

    if (await Listing.exists(filter)) {
      continue;
    }

    const locationKey = `${sample.location}, ${sample.country}`;
    if (!geocodedLocations.has(locationKey)) {
      const response = await geocodingClient
        .forwardGeocode({ query: locationKey, limit: 1 })
        .send();
      const geometry = response.body.features[0]?.geometry;

      if (!geometry) {
        throw new Error(`Mapbox could not find coordinates for ${locationKey}.`);
      }

      geocodedLocations.set(locationKey, geometry);
    }

    const listing = {
      ...sample,
      owner: owner._id,
      geometry: geocodedLocations.get(locationKey),
    };

    const result = await Listing.updateOne(
      filter,
      { $setOnInsert: listing },
      { upsert: true, runValidators: true },
    );
    addedListings += result.upsertedCount;
  }

  console.log(`Added ${addedListings} sample listings for ${owner.username}.`);
}

seedListings()
  .catch((error) => {
    console.error("Sample listing seed failed:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
