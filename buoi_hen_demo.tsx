import React, { useState, useMemo, useEffect } from 'react';
import {
  Calendar,
  Clock,
  MapPin,
  Pin,
  Plus,
  Trash2,
  Edit3,
  Check,
  X,
  Sparkles,
  Sun,
  CloudRain,
  Navigation,
  GripVertical,
  Phone,
  Mail,
  Send,
  UserPlus,
  CheckCircle2,
  AlertTriangle,
  Share2,
  Download,
  StickyNote,
  ArrowUp,
  ArrowDown,
  RotateCcw,
  Heart,
  Coffee,
  Utensils,
  Camera,
  sunset,
  Info,
  Save,
  History,
  ChevronRight,
  CheckSquare,
  Square
} from 'lucide-react';

// ==========================================
// DỮ LIỆU MẪU & KHO ĐỊA ĐIỂM HẸN HÒ HÀ NỘI
// ==========================================
const HANOI_SPOTS_SUGGESTIONS = [
  {
    name: 'Là Việt Coffee',
    category: 'coffee',
    icon: '☕',
    isIndoor: true,
    district: 'Đống Đa',
    lat: 21.0125,
    lng: 105.8265,
    defaultDuration: 60,
    recommendedWindow: 'afternoon',
    defaultNote: 'Không gian mùi cà phê rang thơm dịu, ngồi tầng 2 yên tĩnh trò chuyện.'
  },
  {
    name: '420 Lab',
    category: 'coffee',
    icon: '☕',
    isIndoor: true,
    district: 'Ba Đình',
    lat: 21.0312,
    lng: 105.8395,
    defaultDuration: 60,
    recommendedWindow: 'afternoon',
    planBRain: '[Plan B Mưa] Đổi từ Là Việt Coffee sang 420 Lab (trong nhà mát mẻ, decor ấm cúng).',
    defaultNote: 'Điểm hẹn mở đầu hành trình, thử dòng Coldbrew đặc trưng.'
  },
  {
    name: 'Bảo Tàng Mỹ Thuật Việt Nam',
    category: 'activity',
    icon: '📸',
    isIndoor: true,
    district: 'Ba Đình',
    lat: 21.0305,
    lng: 105.8372,
    defaultDuration: 75,
    recommendedWindow: 'golden_hour',
    defaultNote: 'Chụp ảnh cầu thang cổ điển tầng 2 và khuôn viên ngoài trời lúc nắng chiều.'
  },
  {
    name: 'Hồ Tây - Đoạn Phố Từ Hoa',
    category: 'sunset',
    icon: '🌅',
    isIndoor: false,
    district: 'Tây Hồ',
    lat: 21.0585,
    lng: 105.8295,
    defaultDuration: 45,
    recommendedWindow: 'sunset',
    defaultNote: 'Dạo bộ đón khung giờ vàng 16:23 - 17:23, nhớ mang máy ảnh film.'
  },
  {
    name: 'Bún Chả Nem Phố Cổ',
    category: 'food',
    icon: '🍜',
    isIndoor: true,
    district: 'Hoàn Kiếm',
    lat: 21.0338,
    lng: 105.8482,
    defaultDuration: 60,
    recommendedWindow: 'dinner',
    defaultNote: 'Gọi thêm nem cua bể giòn nóng, nạp năng lượng buổi tối.'
  },
  {
    name: 'An Lạc Chay Quán',
    category: 'food',
    icon: '🥗',
    isIndoor: true,
    district: 'Hoàn Kiếm',
    lat: 21.0285,
    lng: 105.8445,
    defaultDuration: 60,
    recommendedWindow: 'dinner',
    defaultNote: 'Bữa tối thanh đạm, ấm cúng, nên đặt bàn trước 30 phút.'
  },
  {
    name: 'Cà Phê Blackbird',
    category: 'coffee',
    icon: '☕',
    isIndoor: true,
    district: 'Hoàn Kiếm',
    lat: 21.0268,
    lng: 105.8492,
    defaultDuration: 60,
    recommendedWindow: 'evening',
    defaultNote: 'Tone màu cam vintage cực hợp kết thúc buổi tối lãng mạn.'
  },
  {
    name: '501 Coffee & Rooftop',
    category: 'coffee',
    icon: '✨',
    isIndoor: false,
    district: 'Hoàn Kiếm',
    lat: 21.0295,
    lng: 105.8520,
    defaultDuration: 60,
    recommendedWindow: 'evening',
    defaultNote: 'Ngắm phố lên đèn, nhớ mang áo khoác mỏng nếu trời trở gió.'
  }
];

const INITIAL_STOPS = [
  {
    id: 'stop-1',
    name: '420 Lab',
    category: 'coffee',
    icon: '☕',
    duration: 60,
    isLocked: true,
    lockedStartTime: '15:00',
    isIndoor: true,
    lat: 21.0312,
    lng: 105.8395,
    planBNote: '[Plan B Mưa] Đổi từ Là Việt Coffee sang 420 Lab (trong nhà mát mẻ).',
    note: 'Điểm hẹn mở đầu hành trình. Nhớ đến sớm 10p chọn chỗ ngồi cạnh cửa sổ.',
    address: 'Ba Đình, Hà Nội'
  },
  {
    id: 'stop-2',
    name: 'Bảo Tàng Mỹ Thuật Việt Nam',
    category: 'activity',
    icon: '📸',
    duration: 75,
    isLocked: true,
    lockedStartTime: '16:15',
    isIndoor: true,
    lat: 21.0305,
    lng: 105.8372,
    planBNote: '',
    note: 'Khớp khung giờ vàng chụp ảnh 16:23 - 17:23 ở hành lang nắng chiều.',
    address: '66 Nguyễn Thái Học, Ba Đình'
  },
  {
    id: 'stop-3',
    name: 'Bún Chả Nem Phố Cổ',
    category: 'food',
    icon: '🍜',
    duration: 60,
    isLocked: false,
    lockedStartTime: null,
    isIndoor: true,
    lat: 21.0338,
    lng: 105.8482,
    planBNote: '',
    note: 'Gọi 2 suất bún chả đặc biệt + nem cua bể.',
    address: 'Hoàn Kiếm, Hà Nội'
  },
  {
    id: 'stop-4',
    name: 'Cà Phê Blackbird',
    category: 'coffee',
    icon: '☕',
    duration: 60,
    isLocked: false,
    lockedStartTime: null,
    isIndoor: true,
    lat: 21.0268,
    lng: 105.8492,
    planBNote: '',
    note: 'Ngồi tâm sự cuối buổi, tặng món quà nhỏ đã chuẩn bị.',
    address: '5 Chân Cầm, Hoàn Kiếm'
  }
];

// ==========================================
// HÀM TIỆN ÍCH TÍNH GIỜ & KHOẢNG CÁCH
// ==========================================
function timeToMinutes(timeStr) {
  if (!timeStr) return 900; // 15:00 default
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

function minutesToTime(totalMinutes) {
  const normalized = ((totalMinutes % 1440) + 1440) % 1440;
  const h = Math.floor(normalized / 60);
  const m = Math.round(normalized % 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function calculateDistanceKm(stopA, stopB) {
  if (!stopA || !stopB) return 0;
  const R = 6371;
  const dLat = ((stopB.lat - stopA.lat) * Math.PI) / 180;
  const dLng = ((stopB.lng - stopA.lng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((stopA.lat * Math.PI) / 180) *
      Math.cos((stopB.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  // Nhân hệ số đường phố thực tế ~1.35
  const roadDist = Math.max(0.6, R * c * 1.35);
  return Number(roadDist.toFixed(1));
}

function calculateTravelMinutes(distKm) {
  // Trung bình 20km/h trong nội thành Hà Nội + 8 phút gửi xe
  const rideMins = Math.ceil((distKm / 20) * 60);
  const parkingMins = 8;
  return Math.max(10, Math.round((rideMins + parkingMins) / 5) * 5);
}

function formatVietnameseDate(dateStr) {
  if (!dateStr) return 'CN, 01/11';
  const d = new Date(dateStr + 'T00:00:00');
  if (isNaN(d.getTime())) return dateStr;
  const days = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
  const dayName = days[d.getDay()];
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${dayName}, ${day}/${month}`;
}

export default function App() {
  // --- STATE LỊCH HẸN CHÍNH ---
  const [appointments, setAppointments] = useState([
    {
      id: 'apt-1',
      title: 'Buổi hẹn cuối tuần tại Là Việt Coffee',
      date: '2026-11-01',
      startTime: '15:00',
      generalNote: 'Mặc đồ tone be/nâu vintage cho hợp màu nắng thu Hà Nội nhé!',
      weatherRainProb: 43,
      weatherTemp: 28
    }
  ]);
  const [activeAptId, setActiveAptId] = useState('apt-1');
  const currentApt = appointments.find((a) => a.id === activeAptId) || appointments[0];

  // --- STATE DANH SÁCH CHẶNG (STOPS) ---
  const [stops, setStops] = useState(INITIAL_STOPS);
  const [savedSnapshots, setSavedSnapshots] = useState([
    {
      id: 'snap-init',
      label: 'Bản lưu lúc 10:30 • 4 mốc thời gian',
      timestamp: 'Vừa lưu tự động'
    }
  ]);
  const [lastSavedText, setLastSavedText] = useState('Đã tự động lưu theo từng mốc giờ');

  // --- STATE CHỈNH SỬA HEADER LỊCH HẸN ---
  const [isEditingHeader, setIsEditingHeader] = useState(false);
  const [headerForm, setHeaderForm] = useState({
    title: currentApt.title,
    date: currentApt.date,
    startTime: currentApt.startTime
  });
  const [showDeleteAptModal, setShowDeleteAptModal] = useState(false);

  // --- STATE KẾT NỐI NGƯỜI THƯƠNG (SĐT / EMAIL) ---
  const [partnerInfo, setPartnerInfo] = useState({
    name: 'Người thương 💕',
    contactType: 'email', // 'email' | 'phone'
    email: 'nguoithuong.hanoi@gmail.com',
    phone: '0987 654 321',
    isConnected: true,
    autoNotify: true,
    lastSync: '2 phút trước'
  });
  const [isEditingPartner, setIsEditingPartner] = useState(false);
  const [partnerForm, setPartnerForm] = useState({
    name: partnerInfo.name,
    email: partnerInfo.email,
    phone: partnerInfo.phone
  });
  const [hasPartnerUpdateBanner, setHasPartnerUpdateBanner] = useState(true);

  // --- STATE KÉO THẢ (DRAG & DROP) ---
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);

  // --- STATE CHỈNH SỬA / THÊM CHẶNG & GHI CHÚ ---
  const [editingStopId, setEditingStopId] = useState(null);
  const [editStopForm, setEditStopForm] = useState(null);
  const [editingNoteStopId, setEditingNoteStopId] = useState(null);
  const [tempNoteText, setTempNoteText] = useState('');
  const [showAddStopModal, setShowAddStopModal] = useState(false);
  const [newStopForm, setNewStopForm] = useState({
    name: '',
    category: 'coffee',
    duration: 60,
    isIndoor: true,
    isLocked: false,
    lockedStartTime: '17:00',
    note: '',
    address: 'Hà Nội'
  });

  // --- STATE CHECKLIST ĐỒ CẦN CHUẨN BỊ & GHI CHÚ CHUNG ---
  const [checklist, setChecklist] = useState([
    { id: 'c1', text: 'Máy ảnh film / Sạc dự phòng đầy pin', done: true },
    { id: 'c2', text: 'Ô trong suốt đề phòng mưa thu rải rác', done: true },
    { id: 'c3', text: 'Đặt bàn trước tại quán ăn tối', done: true },
    { id: 'c4', text: 'Hoa nhỏ hoặc kẹp tóc tặng người ấy', done: true }
  ]);
  const [newCheckItem, setNewCheckItem] = useState('');
  const [showChecklistModal, setShowChecklistModal] = useState(false);

  // --- STATE MODAL GỢI Ý AI & STORY SHARE & TOAST ---
  const [aiSuggestionPreview, setAiSuggestionPreview] = useState(null);
  const [showStoryModal, setShowStoryModal] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast((prev) => (prev?.message === message ? null : prev));
    }, 3400);
  };

  // ==========================================
  // ENGINE TÍNH TOÁN TIMELINE THEO MỐC THỜI GIAN
  // ==========================================
  const computedTimeline = useMemo(() => {
    let currentMin = timeToMinutes(currentApt.startTime || '15:00');

    return stops.map((stop, idx) => {
      const prevStop = idx > 0 ? stops[idx - 1] : null;
      const distKm = idx === 0 ? 0 : calculateDistanceKm(prevStop, stop);
      const travelMins = idx === 0 ? 0 : calculateTravelMinutes(distKm);

      let startMin = currentMin + travelMins;
      let timeConflictWarning = null;

      // Nếu chặng được ghim cố định giờ (isLocked)
      if (stop.isLocked && stop.lockedStartTime) {
        const lockedMin = timeToMinutes(stop.lockedStartTime);
        if (idx > 0 && lockedMin < startMin) {
          timeConflictWarning = `Giờ cố định (${stop.lockedStartTime}) sớm hơn giờ di chuyển dự kiến (${minutesToTime(startMin)})`;
        }
        startMin = lockedMin;
      }

      const endMin = startMin + (Number(stop.duration) || 60);
      currentMin = endMin;

      const startTimeStr = minutesToTime(startMin);
      const endTimeStr = minutesToTime(endMin);

      // Kiểm tra xem chặng có khớp Giờ Vàng (16:23 - 17:23) không
      const overlapsGoldenHour = startMin <= 1043 && endMin >= 983;

      return {
        ...stop,
        index: idx,
        startTimeStr,
        endTimeStr,
        startMin,
        endMin,
        distKm,
        travelMins,
        timeConflictWarning,
        overlapsGoldenHour
      };
    });
  }, [stops, currentApt.startTime]);

  // Tổng kết hành trình
  const itineraryStats = useMemo(() => {
    if (computedTimeline.length === 0) {
      return { totalKm: 0, totalDurationStr: '0 giờ', startStr: '--:--', endStr: '--:--' };
    }
    const totalKm = computedTimeline
      .reduce((acc, s) => acc + s.distKm, 0)
      .toFixed(1);
    const firstMin = computedTimeline[0].startMin;
    const lastMin = computedTimeline[computedTimeline.length - 1].endMin;
    const diffMins = Math.max(0, lastMin - firstMin);
    const hrs = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    return {
      totalKm,
      totalDurationStr: `${hrs > 0 ? `${hrs}h` : ''}${mins > 0 ? ` ${mins}p` : ''}`.trim() || '0p',
      startStr: computedTimeline[0].startTimeStr,
      endStr: computedTimeline[computedTimeline.length - 1].endTimeStr
    };
  }, [computedTimeline]);

  // Tự động đánh dấu lưu mỗi khi timeline thay đổi
  useEffect(() => {
    const now = new Date();
    const timeFormatted = `${String(now.getHours()).padStart(2, '0')}:${String(
      now.getMinutes()
    ).padStart(2, '0')}`;
    setLastSavedText(`Đã lưu tự động ${computedTimeline.length} mốc giờ lúc ${timeFormatted}`);
  }, [computedTimeline]);

  // ==========================================
  // XỬ LÝ KÉO THẢ (DRAG & DROP)
  // ==========================================
  const handleDragStart = (e, index) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    setDragOverIndex(index);
  };

  const handleDrop = (e, dropIndex) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    const updated = [...stops];
    const [movedItem] = updated.splice(draggedIndex, 1);

    // Khi người dùng kéo thả đổi vị trí, nếu chặng đó đang khóa giờ cũ gây lệch thứ tự,
    // tự động mở khóa giờ chặng vừa kéo để hệ thống xếp lại mốc giờ mượt mà
    const adjustedItem = {
      ...movedItem,
      isLocked: false,
      lockedStartTime: null
    };
    updated.splice(dropIndex, 0, adjustedItem);

    setStops(updated);
    setDraggedIndex(null);
    setDragOverIndex(null);
    showToast(`Đã đổi vị trí "${movedItem.name}" và tự động cập nhật lại các mốc giờ!`);
  };

  const moveStopByStep = (index, direction) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= stops.length) return;
    const updated = [...stops];
    const [moved] = updated.splice(index, 1);
    updated.splice(targetIndex, 0, { ...moved, isLocked: false, lockedStartTime: null });
    setStops(updated);
    showToast(`Đã di chuyển "${moved.name}" và tính lại mốc thời gian.`);
  };

  // ==========================================
  // CÁC HÀM THAO TÁC CHẶNG (SỬA, XÓA, GHIM, TĂNG/GIẢM GIỜ)
  // ==========================================
  const adjustStopDuration = (stopId, deltaMinutes) => {
    setStops((prev) =>
      prev.map((s) => {
        if (s.id !== stopId) return s;
        const newDur = Math.max(15, Math.min(240, (Number(s.duration) || 60) + deltaMinutes));
        return { ...s, duration: newDur };
      })
    );
    showToast(
      `Đã điều chỉnh thời lượng ${deltaMinutes > 0 ? `+${deltaMinutes}p` : `${deltaMinutes}p`} và đẩy các mốc giờ kế tiếp.`
    );
  };

  const toggleLockStop = (stopItem) => {
    setStops((prev) =>
      prev.map((s) => {
        if (s.id !== stopItem.id) return s;
        const nextLocked = !s.isLocked;
        return {
          ...s,
          isLocked: nextLocked,
          lockedStartTime: nextLocked ? stopItem.startTimeStr : null
        };
      })
    );
    showToast(
      !stopItem.isLocked
        ? `📌 Đã cố định mốc giờ ${stopItem.startTimeStr} cho "${stopItem.name}"`
        : `Đã bỏ cố định giờ "${stopItem.name}", tự động nối tiếp chặng trước`
    );
  };

  const handleDeleteStop = (stopId, stopName) => {
    setStops((prev) => prev.filter((s) => s.id !== stopId));
    showToast(`Đã xóa chặng "${stopName}" và cập nhật lại lịch trình.`, 'info');
  };

  const startEditingStop = (stopItem) => {
    setEditingStopId(stopItem.id);
    setEditStopForm({
      name: stopItem.name,
      category: stopItem.category || 'coffee',
      duration: stopItem.duration,
      isLocked: stopItem.isLocked,
      lockedStartTime: stopItem.lockedStartTime || stopItem.startTimeStr,
      note: stopItem.note || '',
      planBNote: stopItem.planBNote || '',
      address: stopItem.address || 'Hà Nội',
      isIndoor: stopItem.isIndoor
    });
  };

  const saveEditingStop = (stopId) => {
    if (!editStopForm.name.trim()) return;
    const iconMap = {
      coffee: '☕',
      food: '🍜',
      activity: '📸',
      sunset: '🌅'
    };
    setStops((prev) =>
      prev.map((s) =>
        s.id === stopId
          ? {
              ...s,
              name: editStopForm.name.trim(),
              category: editStopForm.category,
              icon: iconMap[editStopForm.category] || '📍',
              duration: Number(editStopForm.duration) || 60,
              isLocked: editStopForm.isLocked,
              lockedStartTime: editStopForm.isLocked ? editStopForm.lockedStartTime : null,
              note: editStopForm.note,
              planBNote: editStopForm.planBNote,
              address: editStopForm.address,
              isIndoor: editStopForm.isIndoor
            }
          : s
      )
    );
    setEditingStopId(null);
    showToast('Đã lưu thay đổi chặng hẹn và cập nhật mốc thời gian!');
  };

  const saveQuickNote = (stopId) => {
    setStops((prev) =>
      prev.map((s) => (s.id === stopId ? { ...s, note: tempNoteText.trim() } : s))
    );
    setEditingNoteStopId(null);
    showToast('Đã lưu ghi chú cho mốc thời gian này!');
  };

  const handleAddStop = (e) => {
    e.preventDefault();
    if (!newStopForm.name.trim()) return;
    const iconMap = {
      coffee: '☕',
      food: '🍜',
      activity: '📸',
      sunset: '🌅'
    };
    const matchedPreset = HANOI_SPOTS_SUGGESTIONS.find(
      (p) => p.name.toLowerCase() === newStopForm.name.trim().toLowerCase()
    );
    const newStop = {
      id: `stop-${Date.now()}`,
      name: newStopForm.name.trim(),
      category: newStopForm.category,
      icon: iconMap[newStopForm.category] || '📍',
      duration: Number(newStopForm.duration) || 60,
      isLocked: newStopForm.isLocked,
      lockedStartTime: newStopForm.isLocked ? newStopForm.lockedStartTime : null,
      isIndoor: newStopForm.isIndoor,
      lat: matchedPreset ? matchedPreset.lat : 21.0285 + (Math.random() - 0.5) * 0.02,
      lng: matchedPreset ? matchedPreset.lng : 105.8412 + (Math.random() - 0.5) * 0.02,
      planBNote: '',
      note: newStopForm.note || 'Ghi chú mới cho chặng này.',
      address: newStopForm.address || 'Hà Nội'
    };

    setStops((prev) => [...prev, newStop]);
    setShowAddStopModal(false);
    setNewStopForm({
      name: '',
      category: 'coffee',
      duration: 60,
      isIndoor: true,
      isLocked: false,
      lockedStartTime: '17:00',
      note: '',
      address: 'Hà Nội'
    });
    showToast(`Đã thêm "${newStop.name}" vào mốc cuối lịch trình!`);
  };

  // ==========================================
  // HỆ THỐNG GỢI Ý LỊCH TRÌNH HỢP LÝ (AI OPTIMIZER)
  // ==========================================
  const generateSmartItinerarySuggestion = (mode = 'full') => {
    if (mode === 'sunset') {
      // Tự xếp giờ sao cho chặng chụp ảnh / hoạt động rơi đúng vào Giờ Vàng 16:23 - 17:23
      setAppointments((prev) =>
        prev.map((a) => (a.id === activeAptId ? { ...a, startTime: '15:00' } : a))
      );
      setStops((prev) => {
        const copy = [...prev];
        // Đưa chặng activity hoặc sunset lên vị trí số 2 để bắt đầu lúc ~16:15
        const sunsetIdx = copy.findIndex(
          (s) => s.category === 'activity' || s.category === 'sunset'
        );
        if (sunsetIdx > -1 && sunsetIdx !== 1 && copy.length >= 2) {
          const [item] = copy.splice(sunsetIdx, 1);
          copy.splice(1, 0, item);
        }
        return copy.map((s, idx) => ({
          ...s,
          isLocked: idx === 1,
          lockedStartTime: idx === 1 ? '16:20' : null
        }));
      });
      showToast('🌅 Đã tự xếp lịch trình khớp khung Giờ Vàng Hoàng Hôn (16:23 - 17:23)!');
      return;
    }

    if (mode === 'indoor') {
      setStops((prev) =>
        prev.map((s) => {
          if (!s.isIndoor) {
            return {
              ...s,
              name: '420 Lab (Không gian Trong nhà)',
              isIndoor: true,
              planBNote: '[Plan B Mưa] Đã chuyển từ điểm ngoài trời sang quán trong nhà ấm cúng.'
            };
          }
          return {
            ...s,
            planBNote:
              s.planBNote || '[Plan B Mưa] Đảm bảo không gian trong nhà có mái che & chỗ gửi xe gần.'
          };
        })
      );
      showToast('🌧️ Đã kích hoạt phương án Phòng Mưa (100% điểm đến trong nhà mát mẻ)!');
      return;
    }

    // Mode === 'full': Hệ thống phân tích trình tự hợp lý nhất:
    // 1. Mở đầu bằng Cafe nhẹ nhàng (15:00 - 16:00)
    // 2. Hoạt động / Bảo tàng / Ngắm hoàng hôn đúng Giờ Vàng (16:15 - 17:30)
    // 3. Ăn tối (Bún chả / Quán ăn) lúc (17:45 - 18:45)
    // 4. Cafe / Chill buổi tối kết thúc gần nhau để giảm quãng đường di chuyển
    const roleOrder = { coffee: 1, activity: 2, sunset: 2, food: 3 };
    const copy = [...stops];

    // Phân loại cafe đầu và cafe cuối nếu có từ 2 quán cafe trở lên
    let firstCoffeeAssigned = false;
    const scored = copy.map((s) => {
      let score = roleOrder[s.category] || 2;
      if (s.category === 'coffee') {
        if (!firstCoffeeAssigned) {
          score = 1;
          firstCoffeeAssigned = true;
        } else {
          score = 4; // Cafe kết thúc buổi tối
        }
      }
      return { ...s, score };
    });

    scored.sort((a, b) => a.score - b.score);

    const optimizedStops = scored.map((s, idx) => ({
      ...s,
      isLocked: idx === 1, // Ghim nhẹ chặng số 2 khớp giờ hoàng hôn
      lockedStartTime: idx === 1 ? '16:15' : null,
      duration: idx === 1 ? 70 : 60
    }));

    setAiSuggestionPreview({
      recommendedStartTime: '15:00',
      reason:
        'Tối ưu theo nhịp sinh học buổi hẹn: Mở đầu Cafe làm quen (15:00) ➔ Tham quan & Chụp ảnh đúng Giờ Vàng Hoàng Hôn (16:15 - 17:25) ➔ Ăn tối nạp năng lượng (17:40) ➔ Cafe tâm sự tối gần khu vực Hoàn Kiếm, giảm 38% quãng đường di chuyển lòng vòng.',
      stops: optimizedStops
    });
  };

  const applyAiSuggestion = () => {
    if (!aiSuggestionPreview) return;
    setAppointments((prev) =>
      prev.map((a) =>
        a.id === activeAptId ? { ...a, startTime: aiSuggestionPreview.recommendedStartTime } : a
      )
    );
    setStops(aiSuggestionPreview.stops);
    setAiSuggestionPreview(null);
    showToast('✨ Đã áp dụng lịch trình tối ưu và lưu theo từng mốc thời gian!');
  };

  // ==========================================
  // XỬ LÝ ĐỒNG BỘ NGƯỜI THƯƠNG & FILE .ICS
  // ==========================================
  const handleSyncFromPartnerBanner = () => {
    setHasPartnerUpdateBanner(false);
    // Mô phỏng cập nhật từ người thương: thêm ghi chú ngọt ngào & chỉnh mốc giờ
    setStops((prev) =>
      prev.map((s, idx) =>
        idx === 0
          ? {
              ...s,
              note: 'Người thương nhắn: "Anh/Em qua đón lúc 14:45 nhé, mình đổi sang 420 Lab ngồi cho mát nha!"'
            }
          : s
      )
    );
    setPartnerInfo((prev) => ({ ...prev, lastSync: 'Vừa xong' }));
    showToast('💞 Đã đồng bộ mốc giờ & lời nhắn mới nhất từ Người thương!');
  };

  const handleSavePartnerConnect = (e) => {
    e.preventDefault();
    setPartnerInfo((prev) => ({
      ...prev,
      name: partnerForm.name.trim() || 'Người thương 💕',
      email: partnerForm.email.trim(),
      phone: partnerForm.phone.trim(),
      isConnected: true,
      lastSync: 'Vừa kết nối'
    }));
    setIsEditingPartner(false);
    showToast('💌 Đã lưu thông tin SĐT & Email kết nối với người thương!');
  };

  const sendItineraryToPartner = () => {
    const dest =
      partnerInfo.email && partnerInfo.phone
        ? `${partnerInfo.phone} & ${partnerInfo.email}`
        : partnerInfo.email || partnerInfo.phone;
    setPartnerInfo((prev) => ({ ...prev, lastSync: 'Vừa gửi thông báo' }));
    showToast(`📲 Đã gửi bản cập nhật lịch trình qua ${dest}!`);
  };

  const handleManualSaveSnapshot = () => {
    const now = new Date();
    const t = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(
      2,
      '0'
    )}`;
    const newSnap = {
      id: `snap-${Date.now()}`,
      label: `Mốc ${itineraryStats.startStr} - ${itineraryStats.endStr} (${computedTimeline.length} chặng)`,
      timestamp: `Lưu lúc ${t}`
    };
    setSavedSnapshots((prev) => [newSnap, ...prev.slice(0, 3)]);
    showToast('💾 Đã lưu cố định lịch trình theo từng mốc thời gian!');
  };

  const exportIcsFile = () => {
    const dateClean = (currentApt.date || '2026-11-01').replace(/-/g, '');
    let icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//DateMate//Lich Hen Ho Ha Noi//VI',
      'CALSCALE:GREGORIAN'
    ];

    computedTimeline.forEach((s) => {
      const startH = s.startTimeStr.replace(':', '') + '00';
      const endH = s.endTimeStr.replace(':', '') + '00';
      icsContent.push(
        'BEGIN:VEVENT',
        `SUMMARY:${s.icon} ${s.name} - ${currentApt.title}`,
        `DTSTART:${dateClean}T${startH}`,
        `DTEND:${dateClean}T${endH}`,
        `DESCRIPTION:${s.note || ''} ${s.planBNote || ''}`,
        `LOCATION:${s.address || 'Hà Nội'}`,
        'END:VEVENT'
      );
    });

    icsContent.push('END:VCALENDAR');
    const blob = new Blob([icsContent.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `DateMate-${currentApt.date}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('📅 Đã tải file Lịch (.ics) chứa từng mốc thời gian về thiết bị!');
  };

  // Xử lý lưu tiêu đề & ngày giờ lịch hẹn
  const saveHeaderMetadata = () => {
    setAppointments((prev) =>
      prev.map((a) =>
        a.id === activeAptId
          ? {
              ...a,
              title: headerForm.title.trim() || 'Buổi hẹn cuối tuần',
              date: headerForm.date,
              startTime: headerForm.startTime
            }
          : a
      )
    );
    setIsEditingHeader(false);
    showToast('🗓️ Đã cập nhật thông tin ngày giờ buổi hẹn!');
  };

  const confirmDeleteAppointment = () => {
    setStops([]);
    setAppointments((prev) =>
      prev.map((a) =>
        a.id === activeAptId
          ? {
              ...a,
              title: 'Lịch hẹn mới (Chưa có địa điểm)',
              startTime: '16:00'
            }
          : a
      )
    );
    setShowDeleteAptModal(false);
    showToast('Đã xóa toàn bộ lịch hẹn cũ. Bạn có thể tạo lịch trình mới!', 'info');
  };

  const completedChecklistCount = checklist.filter((c) => c.done).length;

  return (
    <div
      className="min-h-screen text-[#2d221c] py-6 px-3 sm:px-6 lg:px-10 relative selection:bg-[#c84b31]/20"
      style={{
        backgroundColor: '#f3ede2',
        backgroundImage: 'radial-gradient(#cbbba0 1.35px, transparent 1.35px)',
        backgroundSize: '18px 18px',
        fontFamily: "'Plus Jakarta Sans', 'Inter', system-ui, sans-serif"
      }}
    >
      {/* CSS TÙY CHỈNH CHO VIỀN AIRMAIL POSTCARD & ANIMATION */}
      <style>{`
        .airmail-card {
          background: repeating-linear-gradient(
            -45deg,
            #c84b31 0px,
            #c84b31 12px,
            #fdfbf7 12px,
            #fdfbf7 20px,
            #35698a 20px,
            #35698a 32px,
            #fdfbf7 32px,
            #fdfbf7 40px
          );
          padding: 9px;
          border-radius: 20px;
          box-shadow: 0 10px 30px -10px rgba(65, 42, 28, 0.14);
        }
        .vintage-shadow {
          box-shadow: 0 8px 28px -8px rgba(74, 52, 35, 0.1);
        }
        .timeline-line::before {
          content: '';
          position: absolute;
          top: 24px;
          bottom: 24px;
          left: 23px;
          width: 2px;
          background: repeating-linear-gradient(
            to bottom,
            #d9c7b2 0px,
            #d9c7b2 6px,
            transparent 6px,
            transparent 12px
          );
          z-index: 0;
        }
      `}</style>

      {/* TOAST THÔNG BÁO NỔI */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 max-w-md bg-[#2d221c] text-[#fdfbf7] px-4 py-3 rounded-xl shadow-2xl border border-[#c84b31] flex items-center gap-3 animate-bounce">
          <Sparkles className="w-5 h-5 text-[#f4b942] shrink-0" />
          <span className="text-sm font-medium">{toast.message}</span>
          <button
            onClick={() => setToast(null)}
            className="ml-auto text-[#cbbba0] hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* BANNER ĐẦU TRANG GIỐNG ẢNH GỐC NHƯNG NÂNG CẤP */}
      <div className="max-w-6xl mx-auto mb-5">
        <div className="bg-[#fdfbf7]/95 backdrop-blur border border-[#e2d6c3] rounded-2xl px-5 py-3.5 flex flex-wrap items-center justify-between gap-3 vintage-shadow">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-full bg-[#c84b31]/15 text-[#c84b31] flex items-center justify-center font-bold">
              💌
            </span>
            <div>
              <p className="text-sm font-semibold text-[#3d2d24]">
                DateMate gợi ý lịch trình hợp thời tiết nhất cho hai đứa nhé:
              </p>
              <p className="text-xs text-[#7d6856]">
                Kéo thả các địa điểm để đổi thứ tự • Hệ thống tự động tính lại từng mốc thời gian & quãng đường
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-xs bg-[#eef6f0] text-[#2b6e44] border border-[#b8dfc6] px-3 py-1.5 rounded-full font-medium">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {lastSavedText}
            </span>
            <button
              onClick={handleManualSaveSnapshot}
              className="inline-flex items-center gap-1.5 text-xs bg-[#fdf3dc] hover:bg-[#f9e7be] text-[#85581A] border border-[#e6c88c] px-3 py-1.5 rounded-full font-semibold transition"
              title="Lưu bản chụp mốc thời gian hiện tại"
            >
              <Save className="w-3.5 h-3.5" />
              Lưu mốc giờ
            </button>
          </div>
        </div>
      </div>

      {/* BỐ CỤC 2 CỘT CHÍNH */}
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ============================================================
            CỘT TRÁI (7/12): LỊCH HẸN, KÉO THẢ TIMELINE, SỬA/XÓA/GHI CHÚ
            ============================================================ */}
        <div className="lg:col-span-7 bg-[#fdfbf7] border border-[#e2d6c3] rounded-2xl p-4 sm:p-6 vintage-shadow">
          {/* 1. HEADER LỊCH HẸN: CHỌN NGÀY, GIỜ, SỬA TÊN, XÓA LỊCH HẸN */}
          <div className="border-b border-[#eee5d7] pb-4 mb-4">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 bg-[#e8f4ec] text-[#2b6e44] text-xs font-bold px-2.5 py-1 rounded-full border border-[#bce0c8]">
                  📍 Lịch hẹn sắp tới
                </span>

                {/* Nút chọn nhanh Ngày & Giờ bắt đầu */}
                <button
                  onClick={() => {
                    setHeaderForm({
                      title: currentApt.title,
                      date: currentApt.date,
                      startTime: currentApt.startTime
                    });
                    setIsEditingHeader(true);
                  }}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-[#5c4738] bg-[#f5efe6] hover:bg-[#ebe0d0] px-2.5 py-1 rounded-full border border-[#dcd0be] transition"
                  title="Bấm để đổi ngày & giờ bắt đầu"
                >
                  <Calendar className="w-3.5 h-3.5 text-[#c84b31]" />
                  <span>{formatVietnameseDate(currentApt.date)}</span>
                  <span>•</span>
                  <Clock className="w-3.5 h-3.5 text-[#c84b31]" />
                  <span>Bắt đầu {currentApt.startTime}</span>
                  <Edit3 className="w-3 h-3 opacity-60" />
                </button>
              </div>

              {/* Cụm nút Tạo ảnh Story / Sửa / Xóa lịch hẹn */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowStoryModal(true)}
                  className="inline-flex items-center gap-1 text-xs font-bold text-[#c84b31] hover:text-[#a3361f] bg-[#fff5f2] hover:bg-[#ffe8e2] px-2.5 py-1 rounded-lg border border-[#f5c6bc] transition"
                >
                  🖼️ Tạo ảnh Story chia sẻ
                </button>
                <button
                  onClick={() => {
                    setHeaderForm({
                      title: currentApt.title,
                      date: currentApt.date,
                      startTime: currentApt.startTime
                    });
                    setIsEditingHeader(!isEditingHeader);
                  }}
                  className="p-1.5 rounded-lg text-[#6e5645] hover:bg-[#f2eae0] transition"
                  title="Sửa tiêu đề & ngày giờ lịch hẹn"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setShowDeleteAptModal(true)}
                  className="p-1.5 rounded-lg text-[#b93829] hover:bg-[#fdeceb] transition"
                  title="Xóa lịch hẹn này"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Form chỉnh sửa Tiêu đề, Ngày hẹn & Giờ bắt đầu */}
            {isEditingHeader ? (
              <div className="mt-3 bg-[#f7f2ea] border border-[#dfd2c0] rounded-xl p-3.5 space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-[#6e5645] mb-1">
                    Tên buổi hẹn hò
                  </label>
                  <input
                    type="text"
                    value={headerForm.title}
                    onChange={(e) => setHeaderForm({ ...headerForm, title: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-lg border border-[#d5c5b0] bg-white text-sm font-bold text-[#2d221c] focus:outline-none focus:border-[#c84b31]"
                    placeholder="Nhập tên buổi hẹn..."
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#6e5645] mb-1">
                      Chọn ngày hẹn
                    </label>
                    <input
                      type="date"
                      value={headerForm.date}
                      onChange={(e) => setHeaderForm({ ...headerForm, date: e.target.value })}
                      className="w-full px-3 py-1.5 rounded-lg border border-[#d5c5b0] bg-white text-sm text-[#2d221c] focus:outline-none focus:border-[#c84b31]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#6e5645] mb-1">
                      Giờ bắt đầu chặng đầu tiên
                    </label>
                    <input
                      type="time"
                      value={headerForm.startTime}
                      onChange={(e) =>
                        setHeaderForm({ ...headerForm, startTime: e.target.value })
                      }
                      className="w-full px-3 py-1.5 rounded-lg border border-[#d5c5b0] bg-white text-sm text-[#2d221c] focus:outline-none focus:border-[#c84b31]"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    onClick={() => setIsEditingHeader(false)}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold text-[#6e5645] hover:bg-[#e8dfd3]"
                  >
                    Hủy
                  </button>
                  <button
                    onClick={saveHeaderMetadata}
                    className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-[#c84b31] text-white hover:bg-[#b03e26] flex items-center gap-1"
                  >
                    <Check className="w-3.5 h-3.5" /> Lưu lịch hẹn
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-2">
                <h1
                  onClick={() => {
                    setHeaderForm({
                      title: currentApt.title,
                      date: currentApt.date,
                      startTime: currentApt.startTime
                    });
                    setIsEditingHeader(true);
                  }}
                  className="text-xl sm:text-2xl font-extrabold text-[#231915] cursor-pointer hover:text-[#c84b31] transition flex items-center gap-2"
                  title="Bấm để sửa tên lịch hẹn"
                >
                  {currentApt.title}
                </h1>
              </div>
            )}
          </div>

          {/* 2. BANNER CẬP NHẬT TỪ NGƯỜI THƯƠNG (GIỐNG ẢNH GỐC NHƯNG BẤM ĐƯỢC THẬT) */}
          {hasPartnerUpdateBanner && (
            <div className="mb-4 bg-[#fceae6] border border-[#df8a79] rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-0.5">
                <p className="text-xs sm:text-sm font-bold text-[#b83723] flex items-center gap-1.5">
                  <span>⚠️</span> Người thương ({partnerInfo.email || partnerInfo.phone}) vừa cập nhật lịch hẹn!
                </p>
                <p className="text-xs text-[#593a34]">
                  Bấm cập nhật để xem mốc giờ mới nhất và lời nhắn mà người ấy vừa chỉnh nhé.
                </p>
              </div>
              <button
                onClick={handleSyncFromPartnerBanner}
                className="shrink-0 bg-[#c84b31] hover:bg-[#ad3b23] text-white text-xs font-bold px-4 py-2 rounded-full shadow-sm transition flex items-center justify-center gap-1.5"
              >
                🔄 Cập nhật ngay
              </button>
            </div>
          )}

          {/* 3. THANH CÔNG CỤ AI GỢI Ý LỊCH TRÌNH HỢP LÝ & CHIPS THÔNG MINH */}
          <div className="mb-4 space-y-2.5">
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => generateSmartItinerarySuggestion('full')}
                className="inline-flex items-center gap-1.5 text-xs font-bold bg-gradient-to-r from-[#c84b31] to-[#d96b38] hover:from-[#b33e25] hover:to-[#c45b2b] text-white px-3.5 py-2 rounded-full shadow-sm transition"
              >
                <Sparkles className="w-3.5 h-3.5" />
                ✨ Hệ thống gợi ý lịch trình hợp lý
              </button>

              <button
                onClick={() => generateSmartItinerarySuggestion('sunset')}
                className="inline-flex items-center gap-1.5 text-xs font-bold bg-[#fdf3dc] hover:bg-[#f9e7be] text-[#5c4018] border border-[#e3c383] px-3 py-1.5 rounded-full transition"
              >
                🌅 Tự xếp giờ khớp Hoàng hôn (16:23)
              </button>

              <button
                onClick={() => generateSmartItinerarySuggestion('indoor')}
                className="inline-flex items-center gap-1.5 text-xs font-bold bg-[#fdfbf7] hover:bg-[#f2ece1] text-[#3d2d24] border border-[#d6c7b2] px-3 py-1.5 rounded-full transition"
              >
                🌧️ Đổi sang quán Trong nhà (Phòng mưa)
              </button>
            </div>

            {/* Hộp xem trước Gợi ý lịch trình hợp lý từ Hệ thống */}
            {aiSuggestionPreview && (
              <div className="bg-[#fffbeb] border-2 border-[#e3b34c] rounded-xl p-3.5 space-y-2.5 animate-fadeIn">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-xs font-extrabold text-[#8c5811]">
                    <Sparkles className="w-4 h-4 text-[#d98218]" />
                    ĐỀ XUẤT LỊCH TRÌNH HỢP LÝ TỪ DATEMATE:
                  </div>
                  <button
                    onClick={() => setAiSuggestionPreview(null)}
                    className="text-xs text-[#8c5811] hover:underline"
                  >
                    Đóng
                  </button>
                </div>
                <p className="text-xs text-[#594224] leading-relaxed">
                  {aiSuggestionPreview.reason}
                </p>
                <div className="flex flex-wrap items-center gap-1.5 text-xs font-semibold text-[#3d2d24]">
                  {aiSuggestionPreview.stops.map((s, i) => (
                    <React.Fragment key={s.id}>
                      <span className="bg-white border border-[#e6d5b8] px-2 py-1 rounded-md">
                        {i + 1}. {s.icon} {s.name}
                      </span>
                      {i < aiSuggestionPreview.stops.length - 1 && (
                        <ChevronRight className="w-3.5 h-3.5 text-[#a68a64]" />
                      )}
                    </React.Fragment>
                  ))}
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    onClick={() => setAiSuggestionPreview(null)}
                    className="px-3 py-1 rounded-lg text-xs font-semibold text-[#6e5645] hover:bg-[#f2e5c9]"
                  >
                    Giữ nguyên lịch cũ
                  </button>
                  <button
                    onClick={applyAiSuggestion}
                    className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-[#c84b31] text-white hover:bg-[#ad3b23] flex items-center gap-1"
                  >
                    <Check className="w-3.5 h-3.5" /> Áp dụng lịch trình này
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* HƯỚNG DẪN KÉO THẢ NHỎ GỌN */}
          <div className="flex items-center justify-between text-xs text-[#7d6856] mb-3 px-1">
            <span className="flex items-center gap-1.5">
              <GripVertical className="w-3.5 h-3.5 text-[#b09b84]" />
              Mẹo: Giữ biểu tượng <b>⋮⋮</b> để kéo thả đổi thứ tự hoặc bấm <b>+15p / -15p</b> để chỉnh mốc giờ
            </span>
            <button
              onClick={() => setShowAddStopModal(true)}
              className="inline-flex items-center gap-1 font-bold text-[#c84b31] hover:underline"
            >
              <Plus className="w-3.5 h-3.5" /> Thêm chặng mới
            </button>
          </div>

          {/* ============================================================
              4. DANH SÁCH CHẶNG THEO MỐC THỜI GIAN (DRAG & DROP TIMELINE)
              ============================================================ */}
          {computedTimeline.length === 0 ? (
            <div className="text-center py-12 bg-[#f8f3eb] rounded-xl border border-dashed border-[#d5c5b0]">
              <p className="text-sm font-semibold text-[#6e5645] mb-2">
                Chưa có địa điểm nào trong lịch hẹn này.
              </p>
              <button
                onClick={() => setShowAddStopModal(true)}
                className="bg-[#c84b31] text-white text-xs font-bold px-4 py-2 rounded-full hover:bg-[#ad3b23]"
              >
                + Thêm địa điểm đầu tiên
              </button>
            </div>
          ) : (
            <div className="relative timeline-line space-y-3.5">
              {computedTimeline.map((stop, idx) => {
                const isBeingDragged = draggedIndex === idx;
                const isDragOver = dragOverIndex === idx;
                const isEditingThis = editingStopId === stop.id;
                const isEditingNote = editingNoteStopId === stop.id;

                return (
                  <div
                    key={stop.id}
                    draggable={!isEditingThis && !isEditingNote}
                    onDragStart={(e) => handleDragStart(e, idx)}
                    onDragOver={(e) => handleDragOver(e, idx)}
                    onDrop={(e) => handleDrop(e, idx)}
                    onDragEnd={() => {
                      setDraggedIndex(null);
                      setDragOverIndex(null);
                    }}
                    className={`relative pl-11 transition-all duration-150 ${
                      isBeingDragged ? 'opacity-45 scale-[0.98]' : 'opacity-100'
                    } ${isDragOver ? 'translate-y-1' : ''}`}
                  >
                    {/* NÚT MỐC THỜI GIAN BÊN TRÁI (TIMELINE NODE) */}
                    <div
                      className={`absolute left-2.5 top-4 w-5 h-5 rounded-full border-2 flex items-center justify-center z-10 text-[10px] font-bold shadow-sm ${
                        stop.isLocked
                          ? 'bg-[#c84b31] border-[#fdfbf7] text-white'
                          : 'bg-[#fdf3dc] border-[#c84b31] text-[#c84b31]'
                      }`}
                      title={`Mốc ${idx + 1}: ${stop.startTimeStr}`}
                    >
                      {idx + 1}
                    </div>

                    {/* THẺ CHẶNG HẸN (STOP CARD) */}
                    <div
                      className={`bg-[#f9f5ed] hover:bg-[#f7f1e6] border rounded-xl p-3.5 transition shadow-sm ${
                        isDragOver
                          ? 'border-2 border-dashed border-[#c84b31] bg-[#fff5f2]'
                          : stop.isLocked
                          ? 'border-[#dfc8a8]'
                          : 'border-[#e4d9c8]'
                      }`}
                    >
                      {/* DÒNG 1: KHUNG GIỜ + TÊN QUÁN + BADGE CỐ ĐỊNH + NÚT ĐIỀU KHIỂN */}
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          {/* Tay nắm kéo thả */}
                          <div
                            className="cursor-grab active:cursor-grabbing text-[#a6927d] hover:text-[#5c4738] p-0.5 -ml-1"
                            title="Kéo thả để sắp xếp lại mốc giờ"
                          >
                            <GripVertical className="w-4 h-4" />
                          </div>

                          {/* Badge Mốc giờ Đỏ gạch chuẩn thiết kế gốc */}
                          <span className="bg-[#c84b31] text-white text-xs font-extrabold px-2.5 py-1 rounded-md tracking-tight shadow-xs">
                            {stop.startTimeStr} - {stop.endTimeStr}
                          </span>

                          {/* Icon + Tên địa điểm */}
                          <h3 className="text-sm sm:text-base font-extrabold text-[#231915] flex items-center gap-1.5">
                            <span>{stop.icon}</span>
                            <span>{stop.name}</span>
                          </h3>

                          {/* Nhãn Cố định giờ */}
                          {stop.isLocked && (
                            <span className="inline-flex items-center gap-1 bg-[#fdf3dc] text-[#785118] border border-[#e3c383] text-[11px] font-bold px-2 py-0.5 rounded-md">
                              📌 Cố định giờ
                            </span>
                          )}

                          {/* Nhãn khớp giờ vàng hoàng hôn */}
                          {stop.overlapsGoldenHour && (
                            <span className="inline-flex items-center gap-1 bg-[#fff0db] text-[#b85d19] border border-[#f5cca0] text-[11px] font-semibold px-2 py-0.5 rounded-md">
                              🌅 Đón Hoàng hôn
                            </span>
                          )}
                        </div>

                        {/* Cụm nút bên phải giống thiết kế gốc (-15p, +15p, Pin) + Sửa & Xóa */}
                        <div className="flex items-center gap-1.5 ml-auto">
                          {/* Nút lên/xuống hỗ trợ màn hình cảm ứng */}
                          <div className="flex items-center border border-[#dcd0be] rounded-md bg-white overflow-hidden mr-1">
                            <button
                              onClick={() => moveStopByStep(idx, -1)}
                              disabled={idx === 0}
                              className="p-1 text-[#6e5645] hover:bg-[#f3ede2] disabled:opacity-30"
                              title="Đẩy lên chặng trước"
                            >
                              <ArrowUp className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => moveStopByStep(idx, 1)}
                              disabled={idx === computedTimeline.length - 1}
                              className="p-1 text-[#6e5645] hover:bg-[#f3ede2] disabled:opacity-30 border-l border-[#dcd0be]"
                              title="Đẩy xuống chặng sau"
                            >
                              <ArrowDown className="w-3 h-3" />
                            </button>
                          </div>

                          <button
                            onClick={() => adjustStopDuration(stop.id, -15)}
                            className="bg-white hover:bg-[#f0e8dc] text-[#2d221c] border border-[#cfc1ae] text-xs font-bold px-2 py-1 rounded-md transition"
                            title="Giảm thời lượng 15 phút"
                          >
                            -15p
                          </button>
                          <button
                            onClick={() => adjustStopDuration(stop.id, 15)}
                            className="bg-white hover:bg-[#f0e8dc] text-[#2d221c] border border-[#cfc1ae] text-xs font-bold px-2 py-1 rounded-md transition"
                            title="Tăng thời lượng 15 phút"
                          >
                            +15p
                          </button>

                          {/* Nút Ghim Cố định giờ */}
                          <button
                            onClick={() => toggleLockStop(stop)}
                            className={`px-2 py-1 rounded-md border text-xs font-bold transition ${
                              stop.isLocked
                                ? 'bg-[#c84b31] text-white border-[#b03e26]'
                                : 'bg-white text-[#c84b31] border-[#cfc1ae] hover:bg-[#fff2ef]'
                            }`}
                            title={
                              stop.isLocked
                                ? 'Đang cố định giờ (Bấm để mở khóa)'
                                : 'Bấm để cố định mốc giờ này'
                            }
                          >
                            📌
                          </button>

                          {/* Nút Sửa chặng */}
                          <button
                            onClick={() => startEditingStop(stop)}
                            className="p-1.5 rounded-md bg-white hover:bg-[#f0e8dc] text-[#5c4738] border border-[#cfc1ae] transition"
                            title="Sửa địa điểm, giờ hoặc ghi chú"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

                          {/* Nút Xóa chặng */}
                          <button
                            onClick={() => handleDeleteStop(stop.id, stop.name)}
                            className="p-1.5 rounded-md bg-white hover:bg-[#fdeceb] text-[#b93829] border border-[#cfc1ae] transition"
                            title="Xóa địa điểm này khỏi lịch trình"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* DÒNG 2: THÔNG TIN DI CHUYỂN HỢP LÝ (ĐÃ FIX LỖI -15 PHÚT TRONG ẢNH GỐC) */}
                      <div className="mt-2 space-y-1 text-xs text-[#6e5645]">
                        {idx === 0 ? (
                          <p className="flex items-center gap-1.5 font-medium">
                            <span>📍</span> Điểm hẹn mở đầu hành trình ({stop.duration} phút tại quán)
                          </p>
                        ) : (
                          <p className="flex items-center gap-1.5">
                            <span>🛵</span>
                            <span>
                              Di chuyển từ <b>{computedTimeline[idx - 1].name}</b>:{' '}
                              <strong className="text-[#2d221c]">+{stop.travelMins} phút</strong> (
                              {stop.distKm} km, đã tính 8p gửi xe) • Dừng chân {stop.duration} phút
                            </span>
                          </p>
                        )}

                        {stop.planBNote && (
                          <p className="text-[#5c4738] italic flex items-center gap-1.5">
                            <span>🏷️</span> {stop.planBNote}
                          </p>
                        )}

                        {stop.timeConflictWarning && (
                          <p className="text-[#b83723] font-semibold flex items-center gap-1 bg-[#fceae6] px-2 py-1 rounded">
                            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                            {stop.timeConflictWarning}
                          </p>
                        )}
                      </div>

                      {/* DÒNG 3: GHI CHÚ RIÊNG CHO TỪNG MỐC THỜI GIAN (INLINE EDITABLE) */}
                      <div className="mt-2.5">
                        {isEditingNote ? (
                          <div className="bg-white border border-[#c84b31] rounded-lg p-2 space-y-2">
                            <textarea
                              rows={2}
                              value={tempNoteText}
                              onChange={(e) => setTempNoteText(e.target.value)}
                              placeholder="Nhập ghi chú cho chặng này (VD: Đặt bàn tầng 2, mua hoa, góc chụp đẹp...)"
                              className="w-full text-xs text-[#2d221c] focus:outline-none resize-none"
                              autoFocus
                            />
                            <div className="flex justify-end gap-1.5">
                              <button
                                onClick={() => setEditingNoteStopId(null)}
                                className="px-2.5 py-1 rounded text-xs text-[#6e5645] hover:bg-[#f3ede2]"
                              >
                                Hủy
                              </button>
                              <button
                                onClick={() => saveQuickNote(stop.id)}
                                className="px-2.5 py-1 rounded text-xs font-bold bg-[#c84b31] text-white hover:bg-[#a63922]"
                              >
                                Lưu ghi chú
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div
                            onClick={() => {
                              setEditingNoteStopId(stop.id);
                              setTempNoteText(stop.note || '');
                            }}
                            className="group cursor-pointer bg-[#fdfbf7] hover:bg-white border border-[#e6dac8] rounded-lg px-2.5 py-1.5 flex items-start justify-between gap-2 transition"
                            title="Bấm để sửa ghi chú cho mốc thời gian này"
                          >
                            <div className="flex items-start gap-1.5 text-xs text-[#4f3d30]">
                              <StickyNote className="w-3.5 h-3.5 text-[#c84b31] shrink-0 mt-0.5" />
                              <span>
                                <strong className="font-semibold text-[#785118]">Ghi chú: </strong>
                                {stop.note ? (
                                  stop.note
                                ) : (
                                  <span className="italic text-[#9c8874]">
                                    Bấm để thêm ghi chú cho mốc giờ này...
                                  </span>
                                )}
                              </span>
                            </div>
                            <span className="text-[11px] text-[#c84b31] opacity-0 group-hover:opacity-100 font-semibold shrink-0">
                              Sửa ghi chú ✎
                            </span>
                          </div>
                        )}
                      </div>

                      {/* FORM SỬA CHI TIẾT CHẶNG HẸN (MỞ KHI BẤM ICON EDIT) */}
                      {isEditingThis && editStopForm && (
                        <div className="mt-3 pt-3 border-t border-[#e2d6c3] bg-white rounded-xl p-3 space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-extrabold text-[#c84b31] uppercase">
                              Chỉnh sửa chi tiết chặng #{idx + 1}
                            </span>
                            <button
                              onClick={() => setEditingStopId(null)}
                              className="text-xs text-[#7d6856] hover:text-[#2d221c]"
                            >
                              Đóng ✕
                            </button>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                            <div className="sm:col-span-2">
                              <label className="block text-[11px] font-semibold text-[#6e5645] mb-1">
                                Tên quán / Địa điểm
                              </label>
                              <input
                                type="text"
                                value={editStopForm.name}
                                onChange={(e) =>
                                  setEditStopForm({ ...editStopForm, name: e.target.value })
                                }
                                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[#d5c5b0] focus:outline-none focus:border-[#c84b31]"
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] font-semibold text-[#6e5645] mb-1">
                                Loại hình
                              </label>
                              <select
                                value={editStopForm.category}
                                onChange={(e) =>
                                  setEditStopForm({ ...editStopForm, category: e.target.value })
                                }
                                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[#d5c5b0] bg-white focus:outline-none focus:border-[#c84b31]"
                              >
                                <option value="coffee">☕ Cà phê</option>
                                <option value="activity">📸 Tham quan / Chụp ảnh</option>
                                <option value="sunset">🌅 Ngắm hoàng hôn</option>
                                <option value="food">🍜 Ăn uống</option>
                              </select>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                            <div>
                              <label className="block text-[11px] font-semibold text-[#6e5645] mb-1">
                                Thời lượng dừng (phút)
                              </label>
                              <input
                                type="number"
                                step="15"
                                min="15"
                                max="240"
                                value={editStopForm.duration}
                                onChange={(e) =>
                                  setEditStopForm({ ...editStopForm, duration: e.target.value })
                                }
                                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[#d5c5b0]"
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] font-semibold text-[#6e5645] mb-1">
                                Chế độ mốc giờ
                              </label>
                              <label className="flex items-center gap-1.5 text-xs mt-1.5 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={editStopForm.isLocked}
                                  onChange={(e) =>
                                    setEditStopForm({
                                      ...editStopForm,
                                      isLocked: e.target.checked
                                    })
                                  }
                                  className="accent-[#c84b31]"
                                />
                                <span>📌 Cố định giờ bắt đầu</span>
                              </label>
                            </div>
                            {editStopForm.isLocked && (
                              <div>
                                <label className="block text-[11px] font-semibold text-[#6e5645] mb-1">
                                  Giờ bắt đầu cố định
                                </label>
                                <input
                                  type="time"
                                  value={editStopForm.lockedStartTime}
                                  onChange={(e) =>
                                    setEditStopForm({
                                      ...editStopForm,
                                      lockedStartTime: e.target.value
                                    })
                                  }
                                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[#d5c5b0]"
                                />
                              </div>
                            )}
                          </div>

                          <div>
                            <label className="block text-[11px] font-semibold text-[#6e5645] mb-1">
                              Ghi chú tại chặng này
                            </label>
                            <input
                              type="text"
                              value={editStopForm.note}
                              onChange={(e) =>
                                setEditStopForm({ ...editStopForm, note: e.target.value })
                              }
                              className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[#d5c5b0]"
                              placeholder="Ghi chú chỗ ngồi, món nước, góc chụp ảnh..."
                            />
                          </div>

                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => setEditingStopId(null)}
                              className="px-3 py-1 rounded-lg text-xs font-semibold text-[#6e5645] hover:bg-[#f3ede2]"
                            >
                              Hủy
                            </button>
                            <button
                              onClick={() => saveEditingStop(stop.id)}
                              className="px-3.5 py-1 rounded-lg text-xs font-bold bg-[#c84b31] text-white hover:bg-[#a63922]"
                            >
                              Lưu thay đổi
                            </button>
                          </div>
                        </div>
                      )}

                      {/* DÒNG 4: CHỈ ĐƯỜNG & THỜI GIAN LƯU */}
                      <div className="mt-2 flex items-center justify-between text-xs">
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                            stop.name + ' Hà Nội'
                          )}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 font-bold text-[#c84b31] hover:underline"
                        >
                          <Navigation className="w-3 h-3" /> Chỉ đường ({stop.address || 'Hà Nội'})
                        </a>
                        <span className="text-[11px] text-[#9c8874]">
                          Mốc #{idx + 1}: {stop.startTimeStr} ➔ {stop.endTimeStr}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* NÚT THÊM ĐỊA ĐIỂM MỚI TRỰC QUAN */}
          <div className="mt-4 pl-11">
            <button
              onClick={() => setShowAddStopModal(true)}
              className="w-full py-2.5 rounded-xl border-2 border-dashed border-[#d5c5b0] hover:border-[#c84b31] bg-[#faf6f0] hover:bg-[#fff5f2] text-xs font-bold text-[#6e5645] hover:text-[#c84b31] transition flex items-center justify-center gap-1.5"
            >
              <Plus className="w-4 h-4" /> Thêm địa điểm mới vào mốc tiếp theo (
              {itineraryStats.endStr})
            </button>
          </div>

          {/* 5. CHÂN CARD TRÁI: ĐỒ CẦN CHUẨN BỊ & LƯU VÀO LỊCH ĐT (.ICS) */}
          <div className="mt-6 pt-4 border-t border-[#eee5d7] flex flex-wrap items-center justify-between gap-3">
            <button
              onClick={() => setShowChecklistModal(true)}
              className="inline-flex items-center gap-2 bg-[#f3ede2] hover:bg-[#e8dfd1] border border-[#d6c7b2] px-3.5 py-2 rounded-full text-xs font-bold text-[#3d2d24] transition"
            >
              <span>☑️ Đồ cần chuẩn bị:</span>
              <span className="text-[#c84b31]">
                {completedChecklistCount}/{checklist.length} xong
              </span>
            </button>

            <div className="flex items-center gap-2">
              <button
                onClick={sendItineraryToPartner}
                className="inline-flex items-center gap-1.5 bg-[#fdf3dc] hover:bg-[#f7e4b9] text-[#785118] border border-[#e3c383] text-xs font-bold px-4 py-2.5 rounded-full transition"
              >
                <Send className="w-3.5 h-3.5" /> Gửi lịch cho Người thương
              </button>
              <button
                onClick={exportIcsFile}
                className="inline-flex items-center gap-1.5 bg-[#c84b31] hover:bg-[#ad3b23] text-white text-xs font-bold px-4 py-2.5 rounded-full shadow-sm transition"
              >
                📅 Lưu vào Lịch ĐT (.ics)
              </button>
            </div>
          </div>
        </div>

        {/* ============================================================
            CỘT PHẢI (5/12): BƯU THIẾP AIRMAIL (THỜI TIẾT + KẾT NỐI SĐT/EMAIL + GHI CHÚ & MỐC LƯU)
            ============================================================ */}
        <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-6">
          <div className="airmail-card">
            <div className="bg-[#fdfbf7] rounded-[13px] p-5 flex flex-col justify-between space-y-5">
              {/* PHẦN 1: DỰ BÁO HẸN HÒ HÀ NỘI (GIỮ NGUYÊN NÉT ĐẸP ẢNH GỐC) */}
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-[11px] font-extrabold tracking-wider text-[#7d6856] uppercase">
                      DỰ BÁO HẸN HÒ HÀ NỘI • {formatVietnameseDate(currentApt.date)}
                    </p>
                    <div className="mt-1 flex items-baseline gap-2 flex-wrap">
                      <span className="text-3xl font-black text-[#231915]">
                        {currentApt.weatherTemp}°C
                      </span>
                      <span className="text-xs font-semibold text-[#5c4738]">
                        Nắng thu dịu • Khả năng mưa{' '}
                        <strong className="text-[#c84b31]">{currentApt.weatherRainProb}%</strong>
                      </span>
                    </div>
                  </div>

                  {/* Tem bưu thiếp HÔM NAY */}
                  <div className="bg-[#fdf6e4] border border-dashed border-[#d9be8b] rounded-xl px-3 py-2 text-center shrink-0">
                    <div className="text-xl leading-none">🌤️</div>
                    <span className="text-[10px] font-extrabold text-[#785118] block mt-1">
                      HÔM NAY
                    </span>
                  </div>
                </div>

                {/* 2 Ô GIỜ VÀNG & GIỜ XANH LÊN ĐÈN */}
                <div className="grid grid-cols-2 gap-3 mt-4">
                  <div className="bg-[#fff9f5] border border-[#e8a48f] rounded-xl p-3">
                    <p className="text-[11px] font-bold text-[#b84a27] flex items-center gap-1">
                      🌅 Giờ vàng chụp ảnh
                    </p>
                    <p className="text-base font-black text-[#231915] mt-0.5">16:23 - 17:23</p>
                    <p className="text-[11px] text-[#7d6856] mt-0.5">Nắng chiều ấm áp nhất</p>
                  </div>

                  <div className="bg-[#f4f8fc] border border-[#9ec1de] rounded-xl p-3">
                    <p className="text-[11px] font-bold text-[#2b5b84] flex items-center gap-1">
                      🌌 Giờ xanh lên đèn
                    </p>
                    <p className="text-base font-black text-[#1d2d3d] mt-0.5">17:23 - 17:53</p>
                    <p className="text-[11px] text-[#5c738a] mt-0.5">Bầu trời xanh thẫm lãng mạn</p>
                  </div>
                </div>

                {/* GỢI Ý THỜI TIẾT */}
                <div className="mt-3.5 bg-[#fdf3d7] border border-[#e6cc8a] rounded-xl p-3 text-xs text-[#4f3d22] leading-relaxed">
                  💡 <strong>Gợi ý cho hai bạn:</strong> Xác suất mưa thấp (43%), trời ít mây dịu
                  mát, cực hợp săn hoàng hôn ngoài trời ở Bảo Tàng Mỹ Thuật hoặc Hồ Tây!
                </div>
              </div>

              {/* PHẦN 2: KẾT NỐI NGƯỜI THƯƠNG QUA SĐT / EMAIL (TÍNH NĂNG MỚI YÊU CẦU) */}
              <div className="border-t border-[#eee5d7] pt-4">
                <div className="flex items-center justify-between mb-2.5">
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#5c4738] flex items-center gap-1.5">
                    <Heart className="w-3.5 h-3.5 text-[#c84b31] fill-[#c84b31]" />
                    Kết nối Người thương (SĐT / Email)
                  </h3>
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#2b6e44] bg-[#e8f4ec] px-2 py-0.5 rounded-full">
                    ● Đã đồng bộ ({partnerInfo.lastSync})
                  </span>
                </div>

                {isEditingPartner ? (
                  <form
                    onSubmit={handleSavePartnerConnect}
                    className="bg-[#f7f2ea] border border-[#dfd2c0] rounded-xl p-3 space-y-2.5"
                  >
                    <div>
                      <label className="block text-[11px] font-semibold text-[#6e5645] mb-0.5">
                        Tên gọi thân mật
                      </label>
                      <input
                        type="text"
                        value={partnerForm.name}
                        onChange={(e) =>
                          setPartnerForm({ ...partnerForm, name: e.target.value })
                        }
                        className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[#d5c5b0] bg-white"
                        placeholder="VD: Em yêu, Anh người yêu..."
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-semibold text-[#6e5645] mb-0.5">
                          Số điện thoại kết nối
                        </label>
                        <input
                          type="tel"
                          value={partnerForm.phone}
                          onChange={(e) =>
                            setPartnerForm({ ...partnerForm, phone: e.target.value })
                          }
                          className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[#d5c5b0] bg-white"
                          placeholder="09xx xxx xxx"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-[#6e5645] mb-0.5">
                          Email nhận lịch (.ics)
                        </label>
                        <input
                          type="email"
                          value={partnerForm.email}
                          onChange={(e) =>
                            setPartnerForm({ ...partnerForm, email: e.target.value })
                          }
                          className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[#d5c5b0] bg-white"
                          placeholder="email@gmail.com"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setIsEditingPartner(false)}
                        className="px-2.5 py-1 text-xs text-[#6e5645]"
                      >
                        Hủy
                      </button>
                      <button
                        type="submit"
                        className="px-3 py-1 rounded-lg text-xs font-bold bg-[#c84b31] text-white"
                      >
                        Lưu kết nối
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="bg-[#f8f3eb] border border-[#e3d7c5] rounded-xl p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold text-[#2d221c]">
                        {partnerInfo.name}
                      </span>
                      <button
                        onClick={() => {
                          setPartnerForm({
                            name: partnerInfo.name,
                            email: partnerInfo.email,
                            phone: partnerInfo.phone
                          });
                          setIsEditingPartner(true);
                        }}
                        className="text-[11px] font-bold text-[#c84b31] hover:underline flex items-center gap-1"
                      >
                        <Edit3 className="w-3 h-3" /> Sửa SĐT / Email
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-[#5c4738]">
                      <div className="flex items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-lg border border-[#e6dac8]">
                        <Phone className="w-3.5 h-3.5 text-[#c84b31] shrink-0" />
                        <span className="truncate font-medium">
                          {partnerInfo.phone || 'Chưa thêm SĐT'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-lg border border-[#e6dac8]">
                        <Mail className="w-3.5 h-3.5 text-[#c84b31] shrink-0" />
                        <span className="truncate font-medium">
                          {partnerInfo.email || 'Chưa thêm Email'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[11px] text-[#7d6856]">
                        Tự động báo khi đổi mốc giờ kéo thả
                      </span>
                      <button
                        onClick={sendItineraryToPartner}
                        className="text-[11px] font-bold bg-[#c84b31]/10 hover:bg-[#c84b31]/20 text-[#c84b31] px-2.5 py-1 rounded-md transition"
                      >
                        Gửi thông báo ngay ➔
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* PHẦN 3: GHI CHÚ CHUNG CHO BUỔI HẸN */}
              <div className="border-t border-[#eee5d7] pt-4">
                <label className="block text-xs font-extrabold uppercase tracking-wider text-[#5c4738] mb-2">
                  📝 Ghi chú chung cho buổi hẹn
                </label>
                <textarea
                  rows={2}
                  value={currentApt.generalNote}
                  onChange={(e) => {
                    const val = e.target.value;
                    setAppointments((prev) =>
                      prev.map((a) => (a.id === activeAptId ? { ...a, generalNote: val } : a))
                    );
                  }}
                  placeholder="Ghi chú dresscode, quà tặng bí mật, lời nhắn..."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[#dfd2c0] bg-[#faf6f0] focus:bg-white focus:outline-none focus:border-[#c84b31] text-[#2d221c]"
                />
              </div>

              {/* PHẦN 4: TÓM TẮT LỊCH TRÌNH ĐÃ LƯU THEO TỪNG MỐC THỜI GIAN */}
              <div className="border-t border-[#eee5d7] pt-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-[#5c4738] flex items-center gap-1.5">
                    <History className="w-3.5 h-3.5 text-[#c84b31]" />
                    Lịch trình lưu theo mốc thời gian
                  </span>
                  <span className="text-[11px] font-bold text-[#785118]">
                    {itineraryStats.totalKm} km • {itineraryStats.totalDurationStr}
                  </span>
                </div>

                {/* Bảng tóm tắt nhanh từng mốc giờ */}
                <div className="bg-[#f8f3eb] border border-[#e3d7c5] rounded-xl p-2.5 space-y-1.5 max-h-44 overflow-y-auto">
                  {computedTimeline.map((s, i) => (
                    <div
                      key={s.id}
                      className="flex items-center justify-between text-xs py-1 px-2 rounded-lg bg-white border border-[#ede3d4]"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className="font-mono font-bold text-[#c84b31] text-[11px]">
                          {s.startTimeStr}-{s.endTimeStr}
                        </span>
                        <span className="truncate font-semibold text-[#2d221c]">
                          {s.icon} {s.name}
                        </span>
                      </div>
                      <span className="text-[10px] text-[#7d6856] shrink-0 ml-2">
                        {i === 0 ? 'Bắt đầu' : `+${s.travelMins}p xe`}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* CHÂN BƯU THIẾP AIRMAIL GIỐNG ẢNH GỐC */}
              <div className="pt-2 border-t border-[#eee5d7] flex items-center justify-between text-[11px] text-[#8c7765]">
                <span>Cập nhật tự động theo Hà Nội</span>
                <span className="font-semibold text-[#5c4738]">Open-Meteo (CC-BY 4.0)</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================
          MODAL 1: THÊM ĐỊA ĐIỂM MỚI VÀO LỊCH TRÌNH
          ============================================================ */}
      {showAddStopModal && (
        <div className="fixed inset-0 z-50 bg-black/45 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#fdfbf7] border-2 border-[#d5c5b0] rounded-2xl max-w-lg w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#eee5d7] pb-3">
              <h3 className="text-base font-extrabold text-[#231915] flex items-center gap-2">
                📍 Thêm chặng mới vào lịch hẹn
              </h3>
              <button
                onClick={() => setShowAddStopModal(false)}
                className="p-1 text-[#7d6856] hover:text-[#231915]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Chọn nhanh từ gợi ý quán đẹp Hà Nội */}
            <div>
              <p className="text-xs font-bold text-[#6e5645] mb-2">
                ✨ Chọn nhanh địa điểm hẹn hò nổi bật tại Hà Nội:
              </p>
              <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto p-1">
                {HANOI_SPOTS_SUGGESTIONS.map((spot) => (
                  <button
                    key={spot.name}
                    type="button"
                    onClick={() =>
                      setNewStopForm({
                        ...newStopForm,
                        name: spot.name,
                        category: spot.category,
                        duration: spot.defaultDuration,
                        isIndoor: spot.isIndoor,
                        note: spot.defaultNote,
                        address: `${spot.district}, Hà Nội`
                      })
                    }
                    className="text-xs bg-[#f3ede2] hover:bg-[#fdf3dc] border border-[#d6c7b2] px-2.5 py-1 rounded-full font-semibold text-[#3d2d24] transition"
                  >
                    {spot.icon} {spot.name}
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleAddStop} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-[#6e5645] mb-1">
                    Tên địa điểm *
                  </label>
                  <input
                    type="text"
                    required
                    value={newStopForm.name}
                    onChange={(e) => setNewStopForm({ ...newStopForm, name: e.target.value })}
                    placeholder="VD: Là Việt Coffee, Hồ Tây, Phố Sách..."
                    className="w-full px-3 py-2 text-xs rounded-lg border border-[#d5c5b0] bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#6e5645] mb-1">
                    Danh mục
                  </label>
                  <select
                    value={newStopForm.category}
                    onChange={(e) => setNewStopForm({ ...newStopForm, category: e.target.value })}
                    className="w-full px-2.5 py-2 text-xs rounded-lg border border-[#d5c5b0] bg-white"
                  >
                    <option value="coffee">☕ Cà phê</option>
                    <option value="activity">📸 Hoạt động / Bảo tàng</option>
                    <option value="sunset">🌅 Săn Hoàng hôn</option>
                    <option value="food">🍜 Ăn uống</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#6e5645] mb-1">
                    Thời gian dự kiến ở lại (phút)
                  </label>
                  <input
                    type="number"
                    step="15"
                    min="15"
                    max="240"
                    value={newStopForm.duration}
                    onChange={(e) => setNewStopForm({ ...newStopForm, duration: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-[#d5c5b0] bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#6e5645] mb-1">
                    Địa chỉ / Khu vực
                  </label>
                  <input
                    type="text"
                    value={newStopForm.address}
                    onChange={(e) => setNewStopForm({ ...newStopForm, address: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-[#d5c5b0] bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#6e5645] mb-1">
                  Ghi chú cho chặng này
                </label>
                <textarea
                  rows={2}
                  value={newStopForm.note}
                  onChange={(e) => setNewStopForm({ ...newStopForm, note: e.target.value })}
                  placeholder="VD: Đặt bàn trước, thử món bánh sừng bò, chụp ảnh ban công..."
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[#d5c5b0] bg-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddStopModal(false)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-[#6e5645] hover:bg-[#eee5d7]"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg text-xs font-bold bg-[#c84b31] text-white hover:bg-[#ad3b23]"
                >
                  + Thêm vào lịch trình
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================
          MODAL 2: CHECKLIST ĐỒ CẦN CHUẨN BỊ
          ============================================================ */}
      {showChecklistModal && (
        <div className="fixed inset-0 z-50 bg-black/45 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#fdfbf7] border-2 border-[#d5c5b0] rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#eee5d7] pb-3">
              <h3 className="text-base font-extrabold text-[#231915]">
                ☑️ Đồ cần chuẩn bị ({completedChecklistCount}/{checklist.length})
              </h3>
              <button
                onClick={() => setShowChecklistModal(false)}
                className="p-1 text-[#7d6856] hover:text-[#231915]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto">
              {checklist.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-2 bg-[#f8f3eb] px-3 py-2 rounded-xl border border-[#e3d7c5]"
                >
                  <button
                    onClick={() =>
                      setChecklist((prev) =>
                        prev.map((c) => (c.id === item.id ? { ...c, done: !c.done } : c))
                      )
                    }
                    className="flex items-center gap-2 text-xs text-left font-medium text-[#2d221c]"
                  >
                    {item.done ? (
                      <CheckSquare className="w-4 h-4 text-[#2b6e44] shrink-0" />
                    ) : (
                      <Square className="w-4 h-4 text-[#8c7765] shrink-0" />
                    )}
                    <span className={item.done ? 'line-through text-[#8c7765]' : ''}>
                      {item.text}
                    </span>
                  </button>
                  <button
                    onClick={() =>
                      setChecklist((prev) => prev.filter((c) => c.id !== item.id))
                    }
                    className="text-[#b93829] hover:opacity-80 p-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!newCheckItem.trim()) return;
                setChecklist((prev) => [
                  ...prev,
                  { id: `c-${Date.now()}`, text: newCheckItem.trim(), done: false }
                ]);
                setNewCheckItem('');
              }}
              className="flex gap-2"
            >
              <input
                type="text"
                value={newCheckItem}
                onChange={(e) => setNewCheckItem(e.target.value)}
                placeholder="Thêm đồ cần chuẩn bị..."
                className="flex-1 px-3 py-2 text-xs rounded-lg border border-[#d5c5b0] bg-white"
              />
              <button
                type="submit"
                className="px-3.5 py-2 rounded-lg text-xs font-bold bg-[#c84b31] text-white"
              >
                Thêm
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================
          MODAL 3: XÁC NHẬN XÓA LỊCH HẸN (KHÔNG DÙNG ALERT/CONFIRM)
          ============================================================ */}
      {showDeleteAptModal && (
        <div className="fixed inset-0 z-50 bg-black/45 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#fdfbf7] border-2 border-[#df8a79] rounded-2xl max-w-sm w-full p-5 shadow-2xl space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-[#fceae6] text-[#c84b31] flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-extrabold text-[#231915]">
              Xóa toàn bộ lịch hẹn này?
            </h3>
            <p className="text-xs text-[#6e5645] leading-relaxed">
              Tất cả các chặng trong <strong>"{currentApt.title}"</strong> sẽ được làm trống để bạn
              lên lịch hẹn mới.
            </p>
            <div className="flex justify-center gap-2 pt-2">
              <button
                onClick={() => setShowDeleteAptModal(false)}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-[#6e5645] bg-[#f3ede2]"
              >
                Giữ lại
              </button>
              <button
                onClick={confirmDeleteAppointment}
                className="px-4 py-2 rounded-lg text-xs font-bold bg-[#b93829] text-white hover:bg-[#96291c]"
              >
                Đồng ý xóa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
          MODAL 4: TẠO ẢNH STORY CHIA SẺ LỊCH TRÌNH
          ============================================================ */}
      {showStoryModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="airmail-card max-w-sm w-full">
            <div className="bg-[#fdfbf7] rounded-[13px] p-5 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold text-[#c84b31] uppercase tracking-wider">
                  💌 DateMate Story Card • {formatVietnameseDate(currentApt.date)}
                </span>
                <button
                  onClick={() => setShowStoryModal(false)}
                  className="text-[#7d6856] hover:text-[#231915]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="text-center border-y border-[#eee5d7] py-3">
                <h4 className="text-base font-black text-[#231915]">{currentApt.title}</h4>
                <p className="text-xs text-[#7d6856] mt-0.5">
                  Cùng {partnerInfo.name} • Hà Nội {currentApt.weatherTemp}°C 🌤️
                </p>
              </div>

              <div className="space-y-2">
                {computedTimeline.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center gap-2.5 bg-[#f8f3eb] px-3 py-2 rounded-xl border border-[#e3d7c5] text-xs"
                  >
                    <span className="bg-[#c84b31] text-white font-bold px-2 py-0.5 rounded text-[11px]">
                      {s.startTimeStr}
                    </span>
                    <div className="truncate">
                      <p className="font-bold text-[#231915] truncate">
                        {s.icon} {s.name}
                      </p>
                      {s.note && (
                        <p className="text-[10px] text-[#7d6856] truncate">{s.note}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => {
                    setShowStoryModal(false);
                    showToast('📸 Đã sao chép thẻ Story để gửi cho người thương!');
                  }}
                  className="w-full py-2 rounded-full bg-[#c84b31] text-white text-xs font-bold hover:bg-[#a63922]"
                >
                  Sao chép & Chia sẻ cho Người thương
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}