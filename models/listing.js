const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const review = require("./review.js");

const listingSchema = new Schema({
  title: String,
  description: String,

  image: {
    filename: {
      type: String,
      default: "listingimage"
    },
    url: {
      type: String,
      default: "https://images.unsplash.com/photo-1552733407-5d5c46c3bb3b?ixlib=rb-4.0.3"
    }
  },

  price: Number,
  location: String,
  country: String,

  reviews: [
    {
    type: Schema.Types.ObjectId,
    ref: "Review",
    },
  ],
});

listingSchema.post("findOneAndDelete", async(listing) =>{
  if(listing){
  await this.deleteMany({_id : {$in : listing.reviews}});
  }
}); 

const Listing = mongoose.model("Listing", listingSchema);
module.exports = Listing;