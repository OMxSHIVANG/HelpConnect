import { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import API from '../services/api';
import { AuthContext } from '../context/AuthContext';
import Loading from '../components/Loading';
import DonorLocationPicker from '../components/DonorLocationPicker';

function ExtraItemsManager({ extraItems, onChange }) {
    const itemsList = extraItems
        ? extraItems.split(',').map((s) => s.trim()).filter(Boolean)
        : [];
    const [newItem, setNewItem] = useState('');

    const handleAdd = (e) => {
        if (e) e.preventDefault();
        const trimmed = newItem.trim();
        if (!trimmed) return;
        if (!itemsList.includes(trimmed)) {
            onChange([...itemsList, trimmed].join(', '));
        }
        setNewItem('');
    };

    const handleRemove = (itemToRemove) => {
        const updated = itemsList.filter((item) => item !== itemToRemove);
        onChange(updated.join(', '));
    };

    return (
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 space-y-3">
            <div>
                <label className="block text-sm font-bold text-purple-900 mb-0.5">
                    🎁 Donate Extra / Additional Items (Optional)
                </label>
                <p className="text-xs text-purple-700">
                    Want to give more? If you want to donate extra or other items along with this requirement, add them below:
                </p>
            </div>

            <div className="flex items-center gap-2">
                <input
                    type="text"
                    value={newItem}
                    onChange={(e) => setNewItem(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAdd();
                        }
                    }}
                    placeholder="e.g. 5 Extra Blankets, Stationery Kit, Biscuits, Warm socks..."
                    className="flex-1 px-3.5 py-2 rounded-lg border border-purple-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition"
                />
                <button
                    type="button"
                    onClick={handleAdd}
                    className="bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs px-4 py-2.5 rounded-lg border-0 cursor-pointer transition whitespace-nowrap shadow-xs"
                >
                    + Add Extra Item
                </button>
            </div>

            {itemsList.length > 0 ? (
                <div className="pt-1">
                    <span className="text-xs font-semibold text-purple-800 block mb-1.5">
                        Extra items you are adding to this donation:
                    </span>
                    <div className="flex flex-wrap gap-2">
                        {itemsList.map((item, idx) => (
                            <span
                                key={idx}
                                className="inline-flex items-center gap-1.5 bg-white text-purple-900 border border-purple-300 px-3 py-1 rounded-full text-xs font-semibold shadow-2xs"
                            >
                                <span>✨ {item}</span>
                                <button
                                    type="button"
                                    onClick={() => handleRemove(item)}
                                    title="Remove this extra item"
                                    className="text-red-500 hover:text-red-700 font-bold ml-1 bg-transparent border-0 cursor-pointer p-0 text-sm leading-none"
                                >
                                    ×
                                </button>
                            </span>
                        ))}
                    </div>
                </div>
            ) : (
                <p className="text-[11px] text-purple-600 italic">
                    No extra items added yet. You can add extra items above if you want to donate more.
                </p>
            )}
        </div>
    );
}

function Donate() {
    const { requirementId } = useParams();
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();

    const [requirement, setRequirement] = useState(null);
    const [loading, setLoading] = useState(true);

    const [quantity, setQuantity] = useState(1);
    const [extraItems, setExtraItems] = useState('');
    const [description, setDescription] = useState('');
    const [pickupAddress, setPickupAddress] = useState(user?.location || '');
    const [city, setCity] = useState(user?.location || '');
    const [latitude, setLatitude] = useState(null);
    const [longitude, setLongitude] = useState(null);
    const [accuracy, setAccuracy] = useState(null);
    const [locationVerificationStatus, setLocationVerificationStatus] = useState('unverified');
    const [image, setImage] = useState('');
    const [isAnonymous, setIsAnonymous] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchReq = async () => {
            try {
                const res = await API.get(`/requirements/${requirementId}`);
                setRequirement(res.data);
                if (res.data.city) setCity(res.data.city);
            } catch (err) {
                console.error('Fetch requirement error:', err);
                setError('Could not load requirement details.');
            } finally {
                setLoading(false);
            }
        };

        fetchReq();
    }, [requirementId]);

    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('image', file);

        setUploading(true);
        setError('');

        try {
            const res = await API.post('/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setImage(res.data.url);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to upload image.');
        } finally {
            setUploading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        const donationQty = parseInt(quantity, 10);
        if (!donationQty || donationQty <= 0) {
            setError('Please enter a valid donation quantity greater than 0.');
            return;
        }

        if (requirement && donationQty > requirement.remainingQuantity) {
            setError(`Donation quantity cannot exceed the remaining needed quantity of ${requirement.remainingQuantity} ${requirement.unit}.`);
            return;
        }

        setSubmitting(true);

        try {
            await API.post('/donations', {
                requirementId,
                quantity: donationQty,
                description,
                pickupAddress,
                city,
                latitude,
                longitude,
                accuracy,
                locationVerificationStatus,
                formattedAddress: pickupAddress ? `${pickupAddress}, ${city}` : city,
                image,
                extraItems,
                isAnonymous,
                // Inherited from requirement specifications
                clothesType: requirement.clothesType || '',
                targetAgeGroup: requirement.targetAgeGroup || '',
                size: requirement.size || '',
                bookClass: requirement.bookClass || '',
                bookType: requirement.bookType || '',
                bookName: requirement.bookName || '',
                foodType: requirement.foodType || '',
                electronicType: requirement.electronicType || '',
                medicineType: requirement.medicineType || '',
                customItems: requirement.customItems || ''
            });

            navigate('/donor/donations');
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to submit donation.');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <Loading />;

    if (!requirement) {
        return (
            <div className="max-w-md mx-auto my-16 text-center px-6">
                <h2 className="text-2xl font-bold text-slate-900 mb-2">Invalid Requirement</h2>
                <Link to="/requirements" className="text-blue-600 font-semibold no-underline hover:text-blue-700">Return to requirements</Link>
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto my-10 px-6">
            <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm">
                <h1 className="text-2xl font-extrabold text-center text-slate-900 mb-2">
                    Donate Material Items 🎁
                </h1>
                <p className="text-center text-slate-500 text-sm mb-6">
                    Fulfilling request: <strong>{requirement.title}</strong> by {requirement.ngo?.ngoName}
                </p>

                {error && (
                    <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm mb-4 border border-red-200">
                        {error}
                    </div>
                )}

                {/* Read-Only: What NGO requested for this requirement */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 mb-5 space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                        <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                            <span>📋</span> Requested Items & Specifications
                        </h3>
                        <span className="text-[11px] bg-slate-200 text-slate-700 px-2 py-0.5 rounded font-semibold">
                            Requirement Needs
                        </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <div>
                            <span className="text-slate-500 block mb-0.5">Category:</span>
                            <div className="flex flex-wrap gap-1">
                                {(requirement.category || 'General').split(',').map((c, idx) => (
                                    <span key={idx} className="bg-sky-100 text-sky-800 px-2 py-0.5 rounded font-semibold">
                                        {c.trim()}
                                    </span>
                                ))}
                            </div>
                        </div>

                        <div>
                            <span className="text-slate-500 block mb-0.5">Remaining Needed:</span>
                            <span className="font-extrabold text-blue-600 text-sm">
                                {requirement.remainingQuantity} {requirement.unit}
                            </span>
                        </div>

                        <div>
                            <span className="text-slate-500 block mb-0.5">NGO City:</span>
                            <span className="font-semibold text-slate-700">{requirement.city}</span>
                        </div>

                        <div>
                            <span className="text-slate-500 block mb-0.5">Urgency:</span>
                            <span className="font-semibold text-orange-700">{requirement.urgency || 'Medium'}</span>
                        </div>

                        {/* Clothes Breakdown */}
                        {requirement.clothesType && (
                            <div className="sm:col-span-2 bg-white p-3 rounded-lg border border-slate-200 space-y-1">
                                <span className="font-bold text-sky-900 block">👕 Requested Clothes:</span>
                                <div className="flex flex-wrap gap-1">
                                    {requirement.clothesType.split(',').map((t, idx) => (
                                        <span key={idx} className="bg-sky-50 text-sky-800 border border-sky-200 px-2 py-0.5 rounded text-xs font-medium">
                                            {t.trim()}
                                        </span>
                                    ))}
                                </div>
                                {(requirement.targetAgeGroup || requirement.size) && (
                                    <p className="text-[11px] text-slate-500 pt-1">
                                        {requirement.targetAgeGroup && <span>Age Group: <strong>{requirement.targetAgeGroup}</strong> </span>}
                                        {requirement.size && <span>| Sizes: <strong>{requirement.size}</strong></span>}
                                    </p>
                                )}
                            </div>
                        )}

                        {/* Books Breakdown */}
                        {requirement.bookName && (
                            <div className="sm:col-span-2 bg-white p-3 rounded-lg border border-slate-200 space-y-1">
                                <span className="font-bold text-emerald-900 block">📚 Requested Book / Subject:</span>
                                <p className="font-bold text-slate-900 text-xs">{requirement.bookName}</p>
                                {(requirement.bookClass || requirement.bookType) && (
                                    <p className="text-[11px] text-slate-500 pt-0.5">
                                        {requirement.bookClass && <span>Class: <strong>{requirement.bookClass}</strong> </span>}
                                        {requirement.bookType && <span>| Type: <strong>{requirement.bookType}</strong></span>}
                                    </p>
                                )}
                            </div>
                        )}

                        {/* Food Breakdown */}
                        {requirement.foodType && (
                            <div className="sm:col-span-2 bg-white p-3 rounded-lg border border-slate-200 space-y-1">
                                <span className="font-bold text-amber-900 block">🍲 Requested Food / Ration Items:</span>
                                <div className="flex flex-wrap gap-1">
                                    {requirement.foodType.split(',').map((f, idx) => (
                                        <span key={idx} className="bg-amber-50 text-amber-900 border border-amber-200 px-2 py-0.5 rounded text-xs font-medium">
                                            {f.trim()}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Electronics Breakdown */}
                        {requirement.electronicType && (
                            <div className="sm:col-span-2 bg-white p-3 rounded-lg border border-slate-200 space-y-1">
                                <span className="font-bold text-cyan-900 block">💻 Requested Electronics & Gadgets:</span>
                                <div className="flex flex-wrap gap-1">
                                    {requirement.electronicType.split(',').map((e, idx) => (
                                        <span key={idx} className="bg-cyan-50 text-cyan-900 border border-cyan-200 px-2 py-0.5 rounded text-xs font-medium">
                                            {e.trim()}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Medicine Breakdown */}
                        {requirement.medicineType && (
                            <div className="sm:col-span-2 bg-white p-3 rounded-lg border border-slate-200 space-y-1">
                                <span className="font-bold text-rose-900 block">💊 Requested Medicine & Medical Supplies:</span>
                                <div className="flex flex-wrap gap-1">
                                    {requirement.medicineType.split(',').map((m, idx) => (
                                        <span key={idx} className="bg-rose-50 text-rose-900 border border-rose-200 px-2 py-0.5 rounded text-xs font-medium">
                                            {m.trim()}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Custom Items Breakdown */}
                        {requirement.customItems && (
                            <div className="sm:col-span-2 bg-white p-3 rounded-lg border border-slate-200 space-y-1">
                                <span className="font-bold text-purple-900 block">✨ Requested Specific Items:</span>
                                <div className="flex flex-wrap gap-1">
                                    {requirement.customItems.split(',').map((c, idx) => (
                                        <span key={idx} className="bg-purple-50 text-purple-900 border border-purple-200 px-2 py-0.5 rounded text-xs font-medium">
                                            {c.trim()}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                            Quantity of Requested Items You Want to Donate ({requirement.unit}) *
                        </label>
                        <input
                            type="number"
                            min="1"
                            max={requirement.remainingQuantity}
                            required
                            value={quantity}
                            onChange={(e) => {
                                const raw = e.target.value;
                                if (raw === '') {
                                    setQuantity('');
                                    return;
                                }
                                const cleaned = raw.replace(/^0+/, '');
                                if (cleaned === '') {
                                    setQuantity('');
                                    return;
                                }
                                const val = parseInt(cleaned, 10);
                                if (!isNaN(val)) {
                                    setQuantity(val);
                                }
                            }}
                            onBlur={() => {
                                if (!quantity || Number(quantity) < 1) {
                                    setQuantity(1);
                                } else if (requirement?.remainingQuantity && Number(quantity) > requirement.remainingQuantity) {
                                    setQuantity(requirement.remainingQuantity);
                                }
                            }}
                            className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                        />
                    </div>

                    {/* Donors can add extra items if they want to donate more other items */}
                    <ExtraItemsManager
                        extraItems={extraItems}
                        onChange={setExtraItems}
                    />

                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                            Pickup / Drop-off City *
                        </label>
                        <input
                            type="text"
                            required
                            value={city}
                            onChange={(e) => setCity(e.target.value)}
                            placeholder="e.g. Meerut"
                            className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                            Full Address for Item Pickup / Handover *
                        </label>
                        <textarea
                            required
                            rows={3}
                            value={pickupAddress}
                            onChange={(e) => setPickupAddress(e.target.value)}
                            placeholder="Enter detailed street address where NGO can pick up or receive items..."
                            className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                        />
                    </div>

                    {/* Interactive GPS and Map Location Selection */}
                    <DonorLocationPicker
                        latitude={latitude}
                        longitude={longitude}
                        accuracy={accuracy}
                        city={city}
                        pickupAddress={pickupAddress}
                        locationVerificationStatus={locationVerificationStatus}
                        onLocationChange={({ latitude: lat, longitude: lng, accuracy: acc, verificationStatus }) => {
                            setLatitude(lat);
                            setLongitude(lng);
                            setAccuracy(acc);
                            setLocationVerificationStatus(verificationStatus);
                        }}
                    />

                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                            Upload Item Photo (Optional)
                        </label>
                        <input
                            type="file"
                            accept="image/*"
                            onChange={handleImageUpload}
                            disabled={uploading}
                            className="w-full p-2 rounded-lg border border-slate-300 text-sm bg-white"
                        />
                        {uploading && <p className="text-xs text-blue-600 mt-1">Uploading photo...</p>}
                        {image && (
                            <div className="mt-2">
                                <img src={image} alt="Uploaded Item Preview" className="w-24 h-24 object-cover rounded-lg border border-slate-300" />
                                <p className="text-xs text-emerald-700 font-semibold mt-1">✓ Image Uploaded Successfully</p>
                            </div>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                            Item Details / Condition Notes (Optional)
                        </label>
                        <textarea
                            rows={3}
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="e.g. Items are packed safely in clean condition."
                            className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                        />
                    </div>

                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5">
                        <label className="flex items-center gap-2.5 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={isAnonymous}
                                onChange={(e) => setIsAnonymous(e.target.checked)}
                                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                            />
                            <div>
                                <span className="text-xs font-bold text-slate-800 block">
                                    Donate Anonymously
                                </span>
                                <span className="text-[11px] text-slate-500 block">
                                    Hide your personal identity from public community contributor lists and public leaderboards.
                                </span>
                            </div>
                        </label>
                    </div>

                    <button
                        type="submit"
                        disabled={submitting || uploading}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-bold text-sm transition cursor-pointer border-0 disabled:opacity-60 disabled:cursor-not-allowed mt-2 shadow-xs"
                    >
                        {submitting ? 'Submitting Request...' : 'Confirm Donation Request'}
                    </button>
                </form>
            </div>
        </div>
    );
}

export default Donate;
