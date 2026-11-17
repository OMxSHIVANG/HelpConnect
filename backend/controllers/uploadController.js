import cloudinary, { configureCloudinary } from '../config/cloudinary.js';
import { formatUploadResponse } from '../views/apiView.js';

// @desc    Upload image to Cloudinary (or fallback Data URI in development)
// @route   POST /api/upload
// @access  Private
export const uploadImage = async (req, res) => {
    try {
        const file = req.file || (req.files && (Array.isArray(req.files) ? req.files[0] : Object.values(req.files)[0]?.[0]));
        if (!file) {
            return res.status(400).json({ success: false, message: 'Please upload an image file' });
        }

        const { isConfigured } = configureCloudinary();

        // If Cloudinary keys exist, upload to Cloudinary
        if (isConfigured) {
            const b64 = Buffer.from(file.buffer).toString('base64');
            const dataURI = `data:${file.mimetype};base64,${b64}`;

            const result = await cloudinary.uploader.upload(dataURI, {
                folder: 'helpconnect_uploads',
                resource_type: 'image',
                transformation: [{ quality: 'auto', fetch_format: 'auto' }]
            });

            return res.json(formatUploadResponse({
                url: result.secure_url,
                public_id: result.public_id
            }));
        } else {
            // Fallback: Convert buffer to base64 Data URI (only in dev/test when Cloudinary keys are omitted)
            const b64 = Buffer.from(file.buffer).toString('base64');
            const dataURI = `data:${file.mimetype};base64,${b64}`;

            return res.json(formatUploadResponse({
                url: dataURI,
                public_id: 'local_upload'
            }));
        }
    } catch (error) {
        console.error('Upload Error:', error);
        res.status(500).json({ success: false, message: error.message || 'Image upload failed' });
    }
};
