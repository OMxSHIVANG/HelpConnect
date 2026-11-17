import { useState, useEffect, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import API from '../../services/api';

const categories = ['Clothes', 'Food', 'Books', 'Toys', 'Medicine', 'School Supplies', 'Electronics', 'Other'];
const urgencies = ['Normal', 'Medium', 'High', 'Critical'];

const clothesTypes = [
  'Winter Jackets / Coats',
  'Sweaters / Hoodies',
  'Shirts / T-Shirts',
  'Pants / Jeans',
  'Blankets / Quilts',
  'Sarees / Suits',
  'Kids Wear',
  'Mixed / Other',
];

const ageGroups = [
  'Infants (0-2 yrs)',
  'Kids (3-7 yrs)',
  'Children (8-12 yrs)',
  'Teens (13-18 yrs)',
  'Adults (19-50 yrs)',
  'Seniors (50+ yrs)',
  'All Ages',
];

const sizes = [
  'Kids / Toddler',
  'Small (S)',
  'Medium (M)',
  'Large (L)',
  'Extra Large (XL)',
  'XXL',
  'Free Size / All Sizes',
];

const bookClasses = [
  'Nursery / KG / Pre-Primary',
  'Class 1st - 5th (Primary)',
  'Class 6th - 8th (Middle)',
  'Class 9th - 10th (High School)',
  'Class 11th - 12th (Senior Secondary)',
  'College / Graduation (B.Tech, B.A, B.Sc)',
  'Competitive Exams (JEE/NEET/UPSC/SSC)',
  'General Reading / Story Books',
];

const bookTypes = [
  'NCERT Textbooks',
  'Reference & Guide Books',
  'Exam Prep & Question Banks',
  'Novel / Story Books / Literature',
  'Notebooks & Registers & Stationery',
  'Full Course Book Set',
  'Other Educational Materials',
];

const foodTypes = [
  'Rice & Wheat Flour (Atta)',
  'Pulses & Lentils (Dal)',
  'Cooking Oil & Ghee',
  'Packaged Food & Biscuits',
  'Baby Food & Milk Formula',
  'Spices, Salt & Sugar',
  'Dry Ration Grocery Kits',
  'Canned & Preserved Foods',
  'Fresh Vegetables & Fruits',
  'Milk & Dairy Products',
  'Drinking Water Bottles',
  'Ready-to-Eat Cooked Meals',
];

const electronicTypes = [
  'Laptops & Computers',
  'Tablets & iPads',
  'Smartphones / Mobiles',
  'Feature / Basic Phones',
  'Power Banks & Chargers',
  'Keyboards, Mice & Cables',
  'Calculators',
  'Torches & Solar Lanterns',
  'Electric Kettles / Heaters',
  'Study Lamps & Desk Lights',
  'Wi-Fi Routers & Dongles',
  'Medical Electronics (BP / Oximeter)',
];

const medicineTypes = [
  'First Aid Kits & Bandages',
  'Paracetamol & Pain Relief',
  'Antiseptics & Dettol / Betadine',
  'Cough & Cold Syrups',
  'ORS & Electrolyte Packets',
  'Chronic Care (BP & Diabetes)',
  'Vitamins & Health Supplements',
  'Baby & Pediatric Medicines',
  'Wheelchairs & Walking Sticks',
  'Thermometers & Pulse Oximeters',
  'Blood Glucose Monitors & Strips',
  'Sanitary Pads & Adult Diapers',
];

function MultiSelectPills({ label, options = [], selected, onChange, disabled, placeholder = 'Add custom item...' }) {
  const currentArray = selected
    ? selected.split(',').map((s) => s.trim()).filter(Boolean)
    : [];

  const [customInput, setCustomInput] = useState('');
  const [customOptions, setCustomOptions] = useState([]);

  const allOptions = Array.from(new Set([...options, ...customOptions, ...currentArray]));

  const toggleOption = (opt) => {
    let updated;
    if (currentArray.includes(opt)) {
      updated = currentArray.filter((item) => item !== opt);
    } else {
      updated = [...currentArray, opt];
    }
    onChange(updated.join(', '));
  };

  const handleAddCustom = (e) => {
    if (e) e.preventDefault();
    const val = customInput.trim();
    if (!val) return;
    if (!customOptions.includes(val)) {
      setCustomOptions((prev) => [...prev, val]);
    }
    if (!currentArray.includes(val)) {
      onChange([...currentArray, val].join(', '));
    }
    setCustomInput('');
  };

  const selectAll = () => {
    onChange(allOptions.join(', '));
  };

  const clearAll = () => {
    onChange('');
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <label className="block text-xs font-semibold text-slate-700">
          {label} <span className="text-[11px] font-normal text-slate-500">(select multiple or add your own)</span>
        </label>
        {!disabled && (
          <div className="flex items-center gap-2 text-[11px]">
            <button
              type="button"
              onClick={selectAll}
              className="text-green-600 hover:text-green-700 font-semibold bg-transparent border-0 cursor-pointer p-0"
            >
              Select All
            </button>
            <span className="text-slate-300">|</span>
            <button
              type="button"
              onClick={clearAll}
              className="text-slate-500 hover:text-slate-700 font-semibold bg-transparent border-0 cursor-pointer p-0"
            >
              Clear
            </button>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto p-1 border border-slate-200 rounded-lg bg-slate-50/50">
        {allOptions.map((opt) => {
          const isSelected = currentArray.includes(opt);
          return (
            <button
              key={opt}
              type="button"
              disabled={disabled}
              onClick={() => toggleOption(opt)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition border ${
                isSelected
                  ? 'bg-green-600 text-white border-green-600 shadow-xs'
                  : 'bg-white text-slate-700 border-slate-300 hover:border-green-400 hover:bg-slate-50'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {isSelected ? `✓ ${opt}` : `+ ${opt}`}
            </button>
          );
        })}
      </div>

      {!disabled && (
        <div className="flex items-center gap-2 pt-1">
          <input
            type="text"
            value={customInput}
            onChange={(e) => setCustomInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddCustom();
              }
            }}
            placeholder={placeholder}
            className="flex-1 sm:max-w-xs px-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-1 focus:ring-green-500"
          />
          <button
            type="button"
            onClick={handleAddCustom}
            className="bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold px-3 py-1.5 rounded-lg border-0 cursor-pointer transition whitespace-nowrap"
          >
            + Add Custom Option
          </button>
        </div>
      )}

      {currentArray.length > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-lg px-2.5 py-1.5 text-xs text-green-800 flex items-center justify-between flex-wrap gap-2">
          <span><strong>Selected:</strong> {currentArray.join(', ')}</span>
          <span className="text-[11px] font-bold bg-green-200 text-green-900 px-1.5 py-0.5 rounded-full whitespace-nowrap">
            {currentArray.length} items
          </span>
        </div>
      )}
    </div>
  );
}

export default function NGOCreateRequirement() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const [ngoProfile, setNgoProfile] = useState(user?.ngoProfile || null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState({ type: '', text: '' });

  // AI Assistant Modal state
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  // Duplicate Check state
  const [duplicateWarning, setDuplicateWarning] = useState(null);
  const [checkingDuplicates, setCheckingDuplicates] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    category: 'Clothes',
    description: '',
    quantity: 10,
    unit: 'pieces',
    city: user?.location || '',
    urgency: 'Medium',
    image: '',
    clothesType: '',
    targetAgeGroup: '',
    size: '',
    bookClass: '',
    bookType: '',
    bookName: '',
    foodType: '',
    electronicType: '',
    medicineType: '',
    customItems: '',
    deadline: '',
    isGroupDonation: false,
    groupTarget: 10
  });

  useEffect(() => {
    let ignore = false;
    API.get('/ngo/profile')
      .then(res => {
        if (!ignore) {
          setNgoProfile(res.data);
          if (res.data.city) {
            setFormData(prev => (prev.city ? prev : { ...prev, city: res.data.city }));
          }
        }
      })
      .catch(err => console.error('Failed to load NGO profile:', err))
      .finally(() => {
        if (!ignore) setLoadingProfile(false);
      });

    return () => { ignore = true; };
  }, []);

  // Duplicate check trigger on title blur
  const checkDuplicate = async () => {
    if (!formData.title || formData.title.length < 5) return;
    try {
      setCheckingDuplicates(true);
      const res = await API.post('/requirements/check-duplicate', {
        title: formData.title,
        category: formData.category,
        city: formData.city
      });
      if (res.data.hasDuplicateWarning) {
        setDuplicateWarning(res.data);
      } else {
        setDuplicateWarning(null);
      }
    } catch {
      // Non-blocking duplicate check
    } finally {
      setCheckingDuplicates(false);
    }
  };

  const handleAiAssist = async (e) => {
    e.preventDefault();
    if (!aiPrompt.trim()) return;
    try {
      setAiLoading(true);
      const res = await API.post('/requirements/ai-assist', { prompt: aiPrompt });
      if (res.data.success && res.data.draft) {
        const d = res.data.draft;
        setFormData(prev => ({
          ...prev,
          title: d.title || prev.title,
          category: d.category || prev.category,
          description: d.description || prev.description,
          quantity: d.quantity || prev.quantity,
          unit: d.unit || prev.unit,
          urgency: d.urgency || prev.urgency,
          targetAgeGroup: d.targetAgeGroup || prev.targetAgeGroup,
          clothesType: d.clothesType || prev.clothesType,
          foodType: d.foodType || prev.foodType,
          bookType: d.bookType || prev.bookType,
          medicineType: d.medicineType || prev.medicineType,
          electronicType: d.electronicType || prev.electronicType,
          deadline: d.suggestedDeadline || prev.deadline,
          isGroupDonation: d.isGroupDonation ?? prev.isGroupDonation,
          groupTarget: d.quantity || prev.groupTarget
        }));
        setShowAiModal(false);
        setAiPrompt('');
        setMsg({ type: 'success', text: '✨ Requirement draft generated! You can review and adjust any field below.' });
      }
    } catch (err) {
      console.error('AI Assist error:', err);
      setMsg({ type: 'error', text: err.response?.data?.message || 'Failed to generate AI draft' });
    } finally {
      setAiLoading(false);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const data = new FormData();
    data.append('image', file);

    setUploading(true);
    setMsg({ type: '', text: '' });
    try {
      const res = await API.post('/upload', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setFormData(prev => ({ ...prev, image: res.data.url }));
    } catch (err) {
      setMsg({ type: 'error', text: err.response?.data?.message || 'Failed to upload image' });
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!ngoProfile?.isVerified) {
      setMsg({
        type: 'error',
        text: 'Your NGO account is currently pending verification. Requirements can only be published once verified by administrators.'
      });
      return;
    }

    const qty = parseInt(formData.quantity, 10);
    if (!qty || qty <= 0) {
      setMsg({ type: 'error', text: 'Please enter a valid quantity greater than 0.' });
      return;
    }

    setSubmitting(true);
    setMsg({ type: '', text: '' });

    try {
      await API.post('/requirements', {
        ...formData,
        quantity: qty,
        groupTarget: formData.isGroupDonation ? (parseInt(formData.groupTarget, 10) || qty) : qty
      });
      setMsg({ type: 'success', text: 'Requirement posted successfully! Redirecting...' });
      setTimeout(() => {
        navigate('/ngo/requirements');
      }, 1200);
    } catch (err) {
      setMsg({ type: 'error', text: err.response?.data?.message || 'Failed to create requirement' });
      setSubmitting(false);
    }
  };

  const isVerified = ngoProfile?.isVerified === true;

  if (loadingProfile) {
    return <div className="flex items-center justify-center h-48 text-slate-500">Checking verification status...</div>;
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Create New Requirement ➕</h1>
          <p className="text-slate-500 text-sm mt-1">Post donation needs to connect with verified community donors.</p>
        </div>
        <button
          type="button"
          disabled={!isVerified}
          onClick={() => setShowAiModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer border-0 transition disabled:opacity-50"
        >
          <span>✨</span>
          <span>AI Draft Assistant</span>
        </button>
      </div>

      {!isVerified && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex items-start gap-3">
          <span className="text-2xl">⚠️</span>
          <div>
            <h4 className="font-bold text-yellow-800 text-sm">Account Verification Required</h4>
            <p className="text-sm text-yellow-700 mt-0.5">
              Your NGO is currently awaiting admin verification. You can review requirements, but you cannot publish new requests until verified.
            </p>
          </div>
        </div>
      )}

      {/* Duplicate Requirement Warning (Feature 10) */}
      {duplicateWarning && (
        <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-4 flex items-start gap-3 text-xs text-amber-900 shadow-xs">
          <span className="text-xl">⚠️</span>
          <div className="space-y-1">
            <h4 className="font-bold text-amber-900 text-sm">Potential Duplicate Requirement Detected</h4>
            <p>{duplicateWarning.warningMessage}</p>
            {duplicateWarning.possibleDuplicates?.map(d => (
              <div key={d._id} className="bg-white/80 p-2 rounded border border-amber-200 mt-1">
                <strong>{d.title}</strong> — {d.category} ({d.remainingQuantity} remaining) • {d.similarityPercentage}% match
              </div>
            ))}
          </div>
        </div>
      )}

      {msg.text && (
        <div className={`p-4 rounded-xl border text-sm ${
          msg.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-700'
        }`}>
          {msg.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm space-y-5">
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-sm font-semibold text-slate-700">Requirement Title *</label>
            {checkingDuplicates && <span className="text-[11px] text-slate-400">Checking duplicates...</span>}
          </div>
          <input
            type="text"
            required
            disabled={!isVerified}
            value={formData.title}
            onBlur={checkDuplicate}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="e.g. Need 100 Class 10 NCERT Science Books"
            className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 transition disabled:bg-slate-50"
          />
        </div>

        <div>
          <MultiSelectPills
            label="Category(ies) *"
            options={categories}
            selected={formData.category}
            disabled={!isVerified}
            onChange={(val) => setFormData({ ...formData, category: val || 'Other' })}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Urgency Level *</label>
            <select
              value={formData.urgency}
              disabled={!isVerified}
              onChange={(e) => setFormData({ ...formData, urgency: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500 transition disabled:bg-slate-50"
            >
              {urgencies.map(u => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Target Fulfillment Deadline</label>
            <input
              type="date"
              disabled={!isVerified}
              value={formData.deadline}
              min={new Date().toISOString().split('T')[0]}
              onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500 transition disabled:bg-slate-50"
            />
          </div>
        </div>

        {/* Feature 5: Group Donation Support */}
        <div className="bg-purple-50/60 border border-purple-200 rounded-xl p-4 space-y-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              disabled={!isVerified}
              checked={formData.isGroupDonation}
              onChange={(e) => setFormData({ ...formData, isGroupDonation: e.target.checked, groupTarget: formData.quantity })}
              className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
            />
            <span className="text-sm font-bold text-purple-900">
              🤝 Enable Community Group Donation
            </span>
          </label>
          <p className="text-xs text-purple-700 pl-6">
            Allows multiple donors to contribute incrementally towards this bulk requirement until the target quantity is met.
          </p>
        </div>

        {/* Clothes Specific Section */}
        {formData.category?.includes('Clothes') && (
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <span>👕</span> Clothes Specifications (Select Multiple Items)
            </h3>

            <MultiSelectPills
              label="Clothes Type(s)"
              options={clothesTypes}
              selected={formData.clothesType}
              disabled={!isVerified}
              onChange={(val) => setFormData({ ...formData, clothesType: val })}
            />

            <MultiSelectPills
              label="Target Age Group(s)"
              options={ageGroups}
              selected={formData.targetAgeGroup}
              disabled={!isVerified}
              onChange={(val) => setFormData({ ...formData, targetAgeGroup: val })}
            />

            <MultiSelectPills
              label="Size(s) Required"
              options={sizes}
              selected={formData.size}
              disabled={!isVerified}
              onChange={(val) => setFormData({ ...formData, size: val })}
            />
          </div>
        )}

        {/* Books / School Supplies Specific Section */}
        {(formData.category?.includes('Books') || formData.category?.includes('School Supplies')) && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-emerald-900 flex items-center gap-2">
              <span>📚</span> Books & Educational Specifications (Select Multiple Levels)
            </h3>
            <div>
              <label className="block text-xs font-semibold text-emerald-900 mb-1">Book Name / Subject Details *</label>
              <input
                type="text"
                disabled={!isVerified}
                value={formData.bookName}
                onChange={(e) => setFormData({ ...formData, bookName: e.target.value })}
                placeholder="e.g. NCERT Science & Maths Class 10, RD Sharma..."
                className="w-full px-3 py-2 rounded-lg border border-emerald-300 text-sm bg-white"
              />
            </div>

            <MultiSelectPills
              label="Class / Standard(s)"
              options={bookClasses}
              selected={formData.bookClass}
              disabled={!isVerified}
              onChange={(val) => setFormData({ ...formData, bookClass: val })}
            />

            <MultiSelectPills
              label="Book / Material Type(s)"
              options={bookTypes}
              selected={formData.bookType}
              disabled={!isVerified}
              onChange={(val) => setFormData({ ...formData, bookType: val })}
            />
          </div>
        )}

        {/* Food Specific Section */}
        {formData.category?.includes('Food') && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-amber-900 flex items-center gap-2">
              <span>🍲</span> Food & Ration Specifications
            </h3>
            <MultiSelectPills
              label="Food Items Needed"
              options={foodTypes}
              selected={formData.foodType}
              disabled={!isVerified}
              onChange={(val) => setFormData({ ...formData, foodType: val })}
            />
          </div>
        )}

        {/* Electronics Section */}
        {formData.category?.includes('Electronics') && (
          <div className="bg-cyan-50 border border-cyan-200 rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-cyan-900 flex items-center gap-2">
              <span>💻</span> Electronics & Devices Needed
            </h3>
            <MultiSelectPills
              label="Electronic Items"
              options={electronicTypes}
              selected={formData.electronicType}
              disabled={!isVerified}
              onChange={(val) => setFormData({ ...formData, electronicType: val })}
            />
          </div>
        )}

        {/* Medicine Section */}
        {formData.category?.includes('Medicine') && (
          <div className="bg-rose-50 border border-rose-200 rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-rose-900 flex items-center gap-2">
              <span>💊</span> Healthcare & Medical Supplies
            </h3>
            <MultiSelectPills
              label="Medical Items"
              options={medicineTypes}
              selected={formData.medicineType}
              disabled={!isVerified}
              onChange={(val) => setFormData({ ...formData, medicineType: val })}
            />
          </div>
        )}

        {/* Custom Items */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-3">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <span>✨</span> Custom / Specific Items Needed
          </h3>
          <p className="text-xs text-slate-500">
            If you need items not listed above, add your custom item tags here.
          </p>
          <MultiSelectPills
            label="Custom Item Tags"
            options={[]}
            selected={formData.customItems}
            disabled={!isVerified}
            placeholder="Type any specific item needed and press Enter..."
            onChange={(val) => setFormData({ ...formData, customItems: val })}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Quantity Needed *</label>
            <input
              type="number"
              min="1"
              required
              disabled={!isVerified}
              value={formData.quantity}
              onChange={(e) => {
                const raw = e.target.value;
                if (raw === '') {
                  setFormData(prev => ({ ...prev, quantity: '', groupTarget: '' }));
                  return;
                }
                const cleaned = raw.replace(/^0+/, '');
                if (cleaned === '') {
                  setFormData(prev => ({ ...prev, quantity: '', groupTarget: '' }));
                  return;
                }
                const num = parseInt(cleaned, 10);
                if (!isNaN(num)) {
                  setFormData(prev => ({ ...prev, quantity: num, groupTarget: num }));
                }
              }}
              onBlur={() => {
                if (!formData.quantity || Number(formData.quantity) < 1) {
                  setFormData(prev => ({ ...prev, quantity: 1, groupTarget: 1 }));
                }
              }}
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 transition disabled:bg-slate-50"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Unit</label>
            <input
              type="text"
              disabled={!isVerified}
              value={formData.unit}
              onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
              placeholder="pieces, sets, boxes..."
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 transition disabled:bg-slate-50"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">City Location *</label>
            <input
              type="text"
              required
              disabled={!isVerified}
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              placeholder="e.g. Meerut, Delhi"
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 transition disabled:bg-slate-50"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">Detailed Description</label>
          <textarea
            rows={3}
            disabled={!isVerified}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Explain why this material is required, who will benefit, and any special guidelines..."
            className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 transition disabled:bg-slate-50"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">Reference Image (Optional)</label>
          <div className="flex items-center gap-4">
            <input
              type="file"
              accept="image/*"
              disabled={!isVerified || uploading}
              onChange={handleImageUpload}
              className="text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100 cursor-pointer"
            />
            {uploading && <span className="text-xs text-slate-500">Uploading image...</span>}
          </div>
          {formData.image && (
            <div className="mt-2">
              <img src={formData.image} alt="Requirement Reference" className="w-24 h-24 object-cover rounded-lg border border-slate-200" />
            </div>
          )}
        </div>

        <div className="pt-2 flex items-center justify-end gap-3">
          <Link
            to="/ngo/requirements"
            className="px-5 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-700 font-semibold text-sm hover:bg-slate-50 no-underline"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={!isVerified || submitting || uploading}
            className="px-6 py-2.5 rounded-lg bg-green-600 hover:bg-green-700 text-white font-bold text-sm shadow cursor-pointer border-0 disabled:opacity-50 transition"
          >
            {submitting ? 'Posting Requirement...' : 'Publish Requirement'}
          </button>
        </div>
      </form>

      {/* AI Assistant Modal (Feature 9) */}
      {showAiModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">✨</span>
                <h3 className="text-base font-bold text-slate-900">AI Requirement Draft Assistant</h3>
              </div>
              <button
                onClick={() => setShowAiModal(false)}
                className="text-slate-400 hover:text-slate-600 bg-transparent border-0 cursor-pointer text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Describe your material need in plain natural language. The AI parser will automatically extract the appropriate category, specifications, recommended quantities, urgency, and deadlines.
            </p>

            <form onSubmit={handleAiAssist} className="space-y-3">
              <textarea
                rows={4}
                required
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder="e.g. We need 60 warm winter blankets and sweaters for kids aged 5 to 12 in our rural community shelter before the cold wave next week."
                className="w-full text-xs p-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
              />

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAiModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold border-0 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={aiLoading || !aiPrompt.trim()}
                  className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-lg text-xs font-semibold border-0 cursor-pointer disabled:opacity-50"
                >
                  {aiLoading ? 'Drafting...' : 'Generate Requirement Draft'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
