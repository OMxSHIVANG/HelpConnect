import mongoose from 'mongoose';
const favouriteNGOSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    ngo: { type: mongoose.Schema.Types.ObjectId, ref: 'NGO', required: true }
}, { timestamps: true });
favouriteNGOSchema.index({ user: 1, ngo: 1 }, { unique: true });
const FavouriteNGO = mongoose.model('FavouriteNGO', favouriteNGOSchema);
export default FavouriteNGO;
