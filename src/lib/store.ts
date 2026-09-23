// =========================================================================
// CARE-MATCH CENTRAL REACTIVE STORE
// Đồng bộ thời gian thực giữa Gia Đình, Người Chăm Sóc và Admin
// Tự động lưu trữ vào LocalStorage & tương thích với REST API / MySQL
// =========================================================================

export interface MessageItem {
  id: string;
  conversationId: string;
  senderRole: 'family' | 'caregiver' | 'admin';
  senderName: string;
  recipientRole: 'family' | 'caregiver' | 'admin';
  recipientName: string;
  content: string;
  time: string;
}

export interface ScheduleItem {
  id: string;
  caregiverId: string;
  caregiverName: string;
  date: string;
  time: string;
  title: string;
  tasks: string;
  person: string;
  status: 'pending' | 'confirmed' | 'completed';
  price: number;
}

export interface CaregiverItem {
  id: string;
  name: string;
  initials: string;
  role: string;
  rating: string;
  reviews: number;
  experience: string;
  distance: string;
  match: number;
  tags: string[];
  color: string;
  bio: string;
  availability: string;
  phone: string;
  district: string;
  careScore: number;
  isApproved: boolean;
  documents: string[];
}

const STORAGE_KEY = 'carematch_central_store_v1';

const INITIAL_MESSAGES: MessageItem[] = [
  {
    id: 'm1',
    conversationId: 'lan-anh',
    senderRole: 'family',
    senderName: 'Chị Mai',
    recipientRole: 'caregiver',
    recipientName: 'Chị Lan Anh',
    content: 'Chào chị Lan Anh, ngày mai chị đến lúc 8h30 như đã hẹn nhé ạ.',
    time: '10:40'
  },
  {
    id: 'm2',
    conversationId: 'lan-anh',
    senderRole: 'caregiver',
    senderName: 'Chị Lan Anh',
    recipientRole: 'family',
    recipientName: 'Chị Mai',
    content: 'Dạ vâng chị Mai, 8h30 sáng mai em có mặt đúng giờ để đo huyết áp cho mẹ ạ!',
    time: '10:45'
  },
  {
    id: 'm3',
    conversationId: 'admin',
    senderRole: 'family',
    senderName: 'Chị Mai',
    recipientRole: 'admin',
    recipientName: 'Admin',
    content: 'Chào Admin, gia đình tôi muốn hỏi về quy trình đổi ca trong gói tháng.',
    time: 'Hôm qua, 15:20'
  },
  {
    id: 'm4',
    conversationId: 'admin',
    senderRole: 'admin',
    senderName: 'Admin',
    recipientRole: 'family',
    recipientName: 'Chị Mai',
    content: 'Chào chị Mai! Với gói tháng, chị được đổi ca miễn phí chỉ cần thông báo trước 24 giờ trên hệ thống ạ.',
    time: 'Hôm qua, 15:30'
  },
  {
    id: 'm5',
    conversationId: 'huong',
    senderRole: 'family',
    senderName: 'Chị Mai',
    recipientRole: 'admin',
    recipientName: 'Chị Hương · CTXH',
    content: 'Dạ vâng, em muốn hỏi thêm về lịch của chị Lan Anh ạ.',
    time: 'Hôm nay, 10:42'
  },
  {
    id: 'm6',
    conversationId: 'huong',
    senderRole: 'admin',
    senderName: 'Chị Hương · CTXH',
    recipientRole: 'family',
    recipientName: 'Chị Mai',
    content: 'Chào chị Mai, em đã xem hồ sơ của mẹ. Chiều nay mình cùng trao đổi thêm nhé.',
    time: 'Hôm nay, 10:43'
  }
];

const INITIAL_SCHEDULES: ScheduleItem[] = [
  {
    id: 'sch-1',
    caregiverId: 'lan-anh',
    caregiverName: 'Nguyễn Lan Anh',
    date: 'Hôm nay, 04/06',
    time: '08:30 - 12:30',
    title: 'Ca sáng: Đo huyết áp & Hỗ trợ vận động Mẹ Lan',
    tasks: 'Đo huyết áp, nhắc thuốc sáng, xoa bóp cổ vai gáy và hỗ trợ đi bộ nhẹ quanh sân.',
    person: 'Nguyễn Lan Anh · Người chăm sóc',
    status: 'confirmed',
    price: 400000
  },
  {
    id: 'sch-2',
    caregiverId: 'lan-anh',
    caregiverName: 'Nguyễn Lan Anh',
    date: 'Thứ Năm, 06/06',
    time: '14:00 - 18:00',
    title: 'Ca chiều: Hỗ trợ tập phục hồi & Nấu bữa tối',
    tasks: 'Hướng dẫn tập giãn cơ khớp gối, nấu cháo yến mạch và trò chuyện cùng mẹ.',
    person: 'Nguyễn Lan Anh · Người chăm sóc',
    status: 'pending',
    price: 400000
  },
  {
    id: 'sch-3',
    caregiverId: 'thu-ha',
    caregiverName: 'Trần Thu Hà',
    date: 'Thứ Hai, 10/06',
    time: '09:00 - 11:30',
    title: 'Tập vật lý trị liệu khớp gối nhẹ',
    tasks: 'Đo huyết áp trước tập, xoa bóp cơ bắp chân và hỗ trợ co duỗi.',
    person: 'Trần Thu Hà · Điều dưỡng',
    status: 'pending',
    price: 350000
  }
];

const INITIAL_CAREGIVERS: CaregiverItem[] = [
  {
    id: 'lan-anh',
    name: 'Nguyễn Lan Anh',
    initials: 'LA',
    role: 'Chăm sóc người cao tuổi',
    rating: '4,9',
    reviews: 38,
    experience: '8 năm kinh nghiệm',
    distance: '2,4 km',
    match: 96,
    tags: ['Chăm sóc tại nhà', 'Theo dõi thuốc', 'Nấu ăn mềm'],
    color: 'linear-gradient(145deg, #d8b984, #9c7655)',
    bio: 'Chị Lan Anh kiên nhẫn, tinh tế và quen chăm sóc người lớn tuổi sau điều trị. Chị ưu tiên lắng nghe thói quen của từng gia đình.',
    availability: 'Có thể bắt đầu từ Thứ Hai, 10/06',
    phone: '0912 345 678',
    district: 'Cầu Giấy & Hai Bà Trưng, Hà Nội',
    careScore: 96,
    isApproved: true,
    documents: ['CCCD gắn chip (2 mặt)', 'Lý lịch tư pháp số 2', 'Bằng CĐ Y tế', 'Giấy khám SK']
  },
  {
    id: 'thu-ha',
    name: 'Trần Thu Hà',
    initials: 'TH',
    role: 'Điều dưỡng chăm sóc tại nhà',
    rating: '4,8',
    reviews: 24,
    experience: '6 năm kinh nghiệm',
    distance: '3,1 km',
    match: 91,
    tags: ['Điều dưỡng', 'Vật lý trị liệu', 'Đo huyết áp'],
    color: 'linear-gradient(145deg, #afc5b0, #638273)',
    bio: 'Chị Thu Hà là điều dưỡng, có thế mạnh về theo dõi phục hồi và hướng dẫn vận động nhẹ nhàng tại nhà.',
    availability: 'Có thể bắt đầu từ Thứ Tư, 12/06',
    phone: '0988 765 432',
    district: 'Đống Đa, Hà Nội',
    careScore: 91,
    isApproved: true,
    documents: ['CCCD gắn chip', 'Chứng chỉ Vật lý trị liệu', 'Giấy khám SK']
  },
  {
    id: 'mai-chi',
    name: 'Lê Mai Chi',
    initials: 'MC',
    role: 'Bạn đồng hành người cao tuổi',
    rating: '4,7',
    reviews: 19,
    experience: '5 năm kinh nghiệm',
    distance: '4,6 km',
    match: 87,
    tags: ['Trò chuyện', 'Đi chợ', 'Đồng hành khám'],
    color: 'linear-gradient(145deg, #e2b49e, #a96e66)',
    bio: 'Cô Mai Chi mang đến năng lượng ấm áp, phù hợp với những gia đình cần một người bạn đồng hành đều đặn và đáng tin.',
    availability: 'Có thể bắt đầu từ Thứ Sáu, 14/06',
    phone: '0903 112 233',
    district: 'Ba Đình, Hà Nội',
    careScore: 87,
    isApproved: false,
    documents: ['CCCD gắn chip', 'Đang chờ bổ sung giấy khám SK']
  }
];

class CareMatchStore {
  private messages: MessageItem[] = INITIAL_MESSAGES;
  private schedules: ScheduleItem[] = INITIAL_SCHEDULES;
  private caregivers: CaregiverItem[] = INITIAL_CAREGIVERS;

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage() {
    if (typeof window === 'undefined') return;
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        if (parsed.messages) this.messages = parsed.messages;
        if (parsed.schedules) this.schedules = parsed.schedules;
        if (parsed.caregivers) this.caregivers = parsed.caregivers;
      }
    } catch (e) {
      console.warn('Lỗi đọc dữ liệu LocalStorage:', e);
    }
  }

  private saveToStorage() {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        messages: this.messages,
        schedules: this.schedules,
        caregivers: this.caregivers
      }));
      window.dispatchEvent(new CustomEvent('carematch:store-updated'));
    } catch (e) {
      console.warn('Lỗi lưu dữ liệu LocalStorage:', e);
    }
  }

  // --- TIN NHẮN (MESSAGES) ---
  public getMessages(conversationId?: string): MessageItem[] {
    if (conversationId) {
      return this.messages.filter(m => m.conversationId === conversationId);
    }
    return [...this.messages];
  }

  public sendMessage(msg: Omit<MessageItem, 'id' | 'time'>): MessageItem {
    const timeStr = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    const newMsg: MessageItem = {
      ...msg,
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      time: timeStr
    };
    this.messages.push(newMsg);
    this.saveToStorage();
    return newMsg;
  }

  // --- LỊCH TRÌNH (SCHEDULES) ---
  public getSchedules(): ScheduleItem[] {
    return [...this.schedules];
  }

  public addSchedule(item: Omit<ScheduleItem, 'id'>): ScheduleItem {
    const newSchedule: ScheduleItem = {
      ...item,
      id: `sch-${Date.now()}`
    };
    this.schedules.unshift(newSchedule);
    this.saveToStorage();
    return newSchedule;
  }

  public updateScheduleStatus(id: string, status: 'pending' | 'confirmed' | 'completed'): boolean {
    const item = this.schedules.find(s => s.id === id);
    if (item) {
      item.status = status;
      this.saveToStorage();
      return true;
    }
    return false;
  }

  // --- NGƯỜI CHĂM SÓC & DUYỆT HỒ SƠ (CAREGIVERS) ---
  public getCaregivers(): CaregiverItem[] {
    return [...this.caregivers];
  }

  public approveCaregiver(id: string, careScore: number = 96): boolean {
    const item = this.caregivers.find(c => c.id === id);
    if (item) {
      item.isApproved = true;
      item.careScore = careScore;
      this.saveToStorage();
      return true;
    }
    return false;
  }
}

export const store = new CareMatchStore();
