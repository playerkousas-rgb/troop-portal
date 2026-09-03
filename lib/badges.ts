/**
 * 獎章／徽章目錄 —— 畀成員「選自己想考的章」用。
 *
 * 只有兩個支部需要（用戶要求）：
 *   ・幼童軍支部（b2）→ 幼童軍**活動徽章**
 *   ・童軍支部（b3）  → 童軍**專科徽章**
 * 其餘支部（小童軍／深資／樂行）唔喺呢度揀。
 *
 * ★ 刻意**唔包括進度性獎章**（幼童軍獎章／歷奇章／高級歷奇章／金紫荊獎章、
 *   童軍探索獎章／標準獎章／高級獎章／總領袖獎章）—— 呢啲係必經階梯，
 *   唔係「自己揀想考邊個」，放喺選單入面只會混亂。
 *
 * 資料來源（2026-09-03 查證）：
 *   ・幼童軍：香港童軍總會《幼童軍訓練綱要》網上擬定簡易版（2025 年 8 月）
 *     https://prog.scouting.org.hk/cub/training-scheme/
 *   ・童軍：《童軍訓練綱要》童軍專科徽章（興趣組／技能組／服務組／教導組）
 *     https://prog.scouting.org.hk/scouts/scout-training-scheme
 *   ・已按青少年活動署第 13/2026 號通告（2026 年 1 月 1 日生效）更新，
 *     並剔除 2026 年 8 月 15 日起取消嘅專章（愛護動物〔興趣組〕、獨木舟國際賽艇、
 *     風帆賽艇舵手、國際友誼〔技能組〕、營地管理、獨木舟救生、護養）。
 *
 * ⚠️ 總會會不時修訂綱要。呢個清單係「方便成員揀」用，
 *    實際考核要求一律以總會最新公佈嘅訓練綱要為準。
 */

export type BadgeItem = {
  /** 穩定 id（儲存用，唔好改名） */
  id: string;
  /** 章名（顯示用） */
  name: string;
  /** 英文名（有就顯示） */
  en?: string;
  /** 三級制度章：初級（紅）／中級（黃）／高級（綠） */
  tiered?: boolean;
};

export type BadgeCategory = {
  id: string;
  title: string;
  desc?: string;
  items: BadgeItem[];
};

export type BadgeScheme = {
  branchId: string;
  branchName: string;
  schemeName: string;
  source: string;
  categories: BadgeCategory[];
  /** 其他獎章（非專科／活動徽章，但成員亦可能想考） */
  others: BadgeCategory[];
};

/* ══════════════════════════════════════════════════════════
   幼童軍支部（b2）—— 活動徽章
   ══════════════════════════════════════════════════════════ */

const CUB_CATEGORIES: BadgeCategory[] = [
  {
    id: 'outdoor', title: '戶外與歷奇', desc: '露營、遠足、定向、探險類',
    items: [
      { id: 'cub_camper', name: '露營章', en: 'Camper' },
      { id: 'cub_explorer', name: '探險章', en: 'Explorer' },
      { id: 'cub_park_orienteer', name: '公園定向章', en: 'Park Orienteer', tiered: true },
      { id: 'cub_map_reader', name: '讀圖章', en: 'Map Reader' },
      { id: 'cub_knotting', name: '繩結章', en: 'Knotting' },
      { id: 'cub_cyclist', name: '單車章', en: 'Cyclist' },
    ],
  },
  {
    id: 'water', title: '水上活動', desc: '游泳、獨木舟、風帆、水上安全',
    items: [
      { id: 'cub_swimmer', name: '游泳章', en: 'Swimmer', tiered: true },
      { id: 'cub_canoeist', name: '獨木舟章', en: 'Canoeist', tiered: true },
      { id: 'cub_sailor', name: '風帆章', en: 'Sailor' },
      { id: 'cub_sailor_seaman', name: '水手章', en: 'Seaman' },
      { id: 'cub_water_safety', name: '水上安全章', en: 'Water Safety' },
    ],
  },
  {
    id: 'sport', title: '運動與體能', desc: '田徑、體操、體適能、運動',
    items: [
      { id: 'cub_athlete', name: '田徑章', en: 'Athlete', tiered: true },
      { id: 'cub_gymnast', name: '體操章', en: 'Gymnast', tiered: true },
      { id: 'cub_physical_fitness', name: '體適能章', en: 'Physical Fitness', tiered: true },
      { id: 'cub_sports', name: '運動章', en: 'Sports' },
      { id: 'cub_archer', name: '射箭章', en: 'Archery', tiered: true },
    ],
  },
  {
    id: 'stem', title: '科學與科技', desc: '科學、電腦、天文、氣象',
    items: [
      { id: 'cub_scientist', name: '科學章', en: 'Scientist' },
      { id: 'cub_computer', name: '電腦章', en: 'Computer' },
      { id: 'cub_astronomer', name: '天象章', en: 'Astronomer' },
      { id: 'cub_meteorologist', name: '氣象章', en: 'Meteorologist' },
    ],
  },
  {
    id: 'arts', title: '藝術與文化', desc: '藝術、音樂、娛樂、攝影、寫作、閱讀',
    items: [
      { id: 'cub_artist', name: '藝術章', en: 'Artist' },
      { id: 'cub_musician', name: '音樂章', en: 'Musician' },
      { id: 'cub_entertainer', name: '娛樂章', en: 'Entertainer' },
      { id: 'cub_photographer', name: '攝影章', en: 'Photographer' },
      { id: 'cub_writer', name: '寫作章', en: 'Writer' },
      { id: 'cub_book_reader', name: '閱讀章', en: 'Book Reader' },
      { id: 'cub_hk_historian', name: '香港歷史章', en: 'Hong Kong Historian' },
      { id: 'cub_linguist', name: '語言章', en: 'Linguist' },
    ],
  },
  {
    id: 'life', title: '生活技能', desc: '烹飪、家務、勞作、園藝、寵物',
    items: [
      { id: 'cub_cook', name: '烹飪章', en: 'Cook' },
      { id: 'cub_home_help', name: '家務章', en: 'Home Help' },
      { id: 'cub_handyman', name: '勞作章', en: 'Handyman' },
      { id: 'cub_gardener', name: '園藝章', en: 'Gardener' },
      { id: 'cub_pet_keeper', name: '寵物章', en: 'Pet Keeper' },
      { id: 'cub_animal_care', name: '愛護動物章', en: 'Animal Care' },
      { id: 'cub_collector', name: '搜集章', en: 'Collector' },
    ],
  },
  {
    id: 'service', title: '安全、服務與世界', desc: '急救、道路安全、共融、宗教、世界友誼',
    items: [
      { id: 'cub_first_aid', name: '急救章', en: 'First Aid' },
      { id: 'cub_road_safety', name: '道路安全章', en: 'Road Safety' },
      { id: 'cub_disability_awareness', name: '共融章', en: 'Disability Awareness' },
      { id: 'cub_religious', name: '宗教章', en: 'Religious' },
      { id: 'cub_world_friendship', name: '世界友誼章', en: 'World Friendship' },
    ],
  },
];

/* ══════════════════════════════════════════════════════════
   童軍支部（b3）—— 專科徽章（興趣組／技能組／服務組／教導組）
   ══════════════════════════════════════════════════════════ */

const SCOUT_CATEGORIES: BadgeCategory[] = [
  {
    id: 'interest', title: '興趣組', desc: '綠色肩帶 · 培養興趣',
    items: [
      { id: 'scout_int_angler', name: '釣魚', en: 'Angler' },
      { id: 'scout_int_archery', name: '射箭', en: 'Archery' },
      { id: 'scout_int_artist', name: '藝術', en: 'Artist' },
      { id: 'scout_int_athlete', name: '運動', en: 'Athlete' },
      { id: 'scout_int_birdwatcher', name: '觀鳥', en: 'Birdwatcher' },
      { id: 'scout_int_boulderer', name: '抱石', en: 'Boulderer' },
      { id: 'scout_int_camp_cook', name: '營地烹飪', en: 'Camp Cook' },
      { id: 'scout_int_campfire_host', name: '營火', en: 'Campfire Host' },
      { id: 'scout_int_canoeist', name: '獨木舟', en: 'Canoeist' },
      { id: 'scout_int_collector', name: '搜集', en: 'Collector' },
      { id: 'scout_int_computer', name: '電腦', en: 'Computer' },
      { id: 'scout_int_cyclist', name: '單車', en: 'Cyclist' },
      { id: 'scout_int_dragon_boatman', name: '龍舟', en: 'Dragon Boatman' },
      { id: 'scout_int_footdrill', name: '步操', en: 'Footdrill' },
      { id: 'scout_int_geologist', name: '地質', en: 'Geologist' },
      { id: 'scout_int_horseman', name: '騎術', en: 'Horseman' },
      { id: 'scout_int_kite_flyer', name: '風箏', en: 'Kite Flyer' },
      { id: 'scout_int_librarian', name: '圖書管理', en: 'Librarian' },
      { id: 'scout_int_meteorologist', name: '氣象', en: 'Meteorologist' },
      { id: 'scout_int_model_maker', name: '模型製作', en: 'Model Maker' },
      { id: 'scout_int_musician', name: '音樂', en: 'Musician' },
      { id: 'scout_int_naturalist', name: '自然', en: 'Naturalist' },
      { id: 'scout_int_park_orienteer', name: '公園定向', en: 'Park Orienteer' },
      { id: 'scout_int_petkeeper', name: '動物飼養', en: 'Pet Keeper' },
      { id: 'scout_int_photographer', name: '攝影', en: 'Photographer' },
      { id: 'scout_int_rowing_boatman', name: '划艇', en: 'Rowing Boatman' },
      { id: 'scout_int_sailor', name: '風帆', en: 'Sailor' },
      { id: 'scout_int_smallholder', name: '農務', en: 'Smallholder' },
      { id: 'scout_int_sup', name: '立划板', en: 'Stand Up Paddleboarder' },
      { id: 'scout_int_sup_polo', name: '立划板水球', en: 'Stand Up Paddling Polo' },
      { id: 'scout_int_swimmer', name: '游泳', en: 'Swimmer' },
      { id: 'scout_int_tourism', name: '旅遊', en: 'Tourism' },
      { id: 'scout_int_windsurfer', name: '滑浪風帆', en: 'Windsurfer' },
    ],
  },
  {
    id: 'pursuit', title: '技能組', desc: '藍色肩帶 · 進階技能',
    items: [
      { id: 'scout_pur_3d_printing', name: '立體打印', en: '3D Printing Technician' },
      { id: 'scout_pur_abseiler', name: '沿繩下降', en: 'Abseiler' },
      { id: 'scout_pur_archery', name: '射箭', en: 'Archery' },
      { id: 'scout_pur_astronomer', name: '天象', en: 'Astronomer' },
      { id: 'scout_pur_aviation_navigator', name: '航空領航', en: 'Aviation Navigator' },
      { id: 'scout_pur_backwoods_cook', name: '原野烹飪', en: 'Backwoods Cook' },
      { id: 'scout_pur_camper', name: '露營', en: 'Camper' },
      { id: 'scout_pur_canoeist', name: '獨木舟', en: 'Canoeist' },
      { id: 'scout_pur_canoe_polo', name: '獨木舟水球', en: 'Canoe Polo' },
      { id: 'scout_pur_climber', name: '攀登', en: 'Climber' },
      { id: 'scout_pur_communicator', name: '通訊', en: 'Communicator' },
      { id: 'scout_pur_cook', name: '烹飪', en: 'Cook' },
      { id: 'scout_pur_craftsman', name: '手藝', en: 'Craftsman' },
      { id: 'scout_pur_data_analyst', name: '數據分析', en: 'Data Analyst' },
      { id: 'scout_pur_electronics', name: '電子', en: 'Electronics' },
      { id: 'scout_pur_explorer', name: '探險', en: 'Explorer' },
      { id: 'scout_pur_flight_simulator', name: '模擬飛行', en: 'Flight Simulator' },
      { id: 'scout_pur_footdrill', name: '步操', en: 'Footdrill' },
      { id: 'scout_pur_map_maker', name: '地圖繪製', en: 'Map Maker' },
      { id: 'scout_pur_map_reader', name: '地圖閱讀', en: 'Map Reader' },
      { id: 'scout_pur_marksman', name: '射擊', en: 'Marksman' },
      { id: 'scout_pur_master_at_arms', name: '技擊', en: 'Master-at-arms' },
      { id: 'scout_pur_mechanic', name: '機械', en: 'Mechanic' },
      { id: 'scout_pur_meteorologist', name: '氣象', en: 'Meteorologist' },
      { id: 'scout_pur_multimedia_designer', name: '多媒體創作', en: 'Multimedia Designer' },
      { id: 'scout_pur_navigator', name: '領航', en: 'Navigator' },
      { id: 'scout_pur_observer', name: '觀察', en: 'Observer' },
      { id: 'scout_pur_orienteer', name: '野外定向', en: 'Orienteer' },
      { id: 'scout_pur_pioneer', name: '先鋒工程', en: 'Pioneer' },
      { id: 'scout_pur_programmer', name: '編程', en: 'Programmer' },
      { id: 'scout_pur_sailor', name: '風帆', en: 'Sailor' },
      { id: 'scout_pur_skin_diver', name: '徒手潛水', en: 'Skin Diver' },
      { id: 'scout_pur_skipper', name: '艇長', en: 'Skipper' },
      { id: 'scout_pur_sportsman', name: '體育', en: 'Sportsman' },
      { id: 'scout_pur_tree_carer', name: '樹木護理', en: 'Tree Carer' },
    ],
  },
  {
    id: 'service', title: '服務組', desc: '紅色肩帶 · 服務他人',
    items: [
      { id: 'scout_srv_animal_carer', name: '愛護動物', en: 'Animal Carer' },
      { id: 'scout_srv_civics', name: '公民', en: 'Civics' },
      { id: 'scout_srv_cybersecurity', name: '網絡安全', en: 'Cybersecurity Analyst' },
      { id: 'scout_srv_diversity_inclusion', name: '多元共融', en: 'Diversity & Inclusion Ambassador' },
      { id: 'scout_srv_fireman', name: '消防', en: 'Fireman' },
      { id: 'scout_srv_first_aider', name: '急救', en: 'First Aider' },
      { id: 'scout_srv_guide', name: '指引', en: 'Guide' },
      { id: 'scout_srv_interpreter', name: '語言', en: 'Interpreter' },
      { id: 'scout_srv_jobman', name: '工藝', en: 'Jobman' },
      { id: 'scout_srv_lifesaver', name: '拯溺', en: 'Lifesaver' },
      { id: 'scout_srv_mental_health', name: '精神健康', en: 'Mental Health Ambassador' },
      { id: 'scout_srv_nutritionist', name: '食物營養', en: 'Nutritionist' },
      { id: 'scout_srv_pilot', name: '領港', en: 'Pilot' },
      { id: 'scout_srv_public_health', name: '公共衞生', en: 'Public Health Ambassador' },
      { id: 'scout_srv_quartermaster', name: '物資管理', en: 'Quartermaster' },
      { id: 'scout_srv_secretary', name: '秘書', en: 'Secretary' },
      { id: 'scout_srv_world_friendship', name: '國際友誼', en: 'World Friendship Ambassador' },
    ],
  },
  {
    id: 'instructor', title: '教導組', desc: '金邊肩帶 · 須先考獲該項專章三個月後方可報考',
    items: [
      { id: 'scout_ins_angler', name: '釣魚', en: 'Angler' },
      { id: 'scout_ins_astronomer', name: '天象', en: 'Astronomer' },
      { id: 'scout_ins_backwoods_cook', name: '原野烹飪', en: 'Backwoods Cook' },
      { id: 'scout_ins_boulderer', name: '抱石', en: 'Boulderer' },
      { id: 'scout_ins_camper', name: '露營', en: 'Camper' },
      { id: 'scout_ins_campfire_host', name: '營火', en: 'Campfire Host' },
      { id: 'scout_ins_communicator', name: '通訊', en: 'Communicator' },
      { id: 'scout_ins_cook', name: '烹飪', en: 'Cook' },
      { id: 'scout_ins_craftsman', name: '手藝', en: 'Craftsman' },
      { id: 'scout_ins_cyclist', name: '單車', en: 'Cyclist' },
      { id: 'scout_ins_flight_simulator', name: '模擬飛行', en: 'Flight Simulator' },
      { id: 'scout_ins_lifesaver', name: '拯溺', en: 'Lifesaver' },
      { id: 'scout_ins_map_maker', name: '地圖繪製', en: 'Map Maker' },
      { id: 'scout_ins_map_reader', name: '地圖閱讀', en: 'Map Reader' },
      { id: 'scout_ins_mechanic', name: '機械', en: 'Mechanic' },
      { id: 'scout_ins_meteorologist', name: '氣象', en: 'Meteorologist' },
      { id: 'scout_ins_model_maker', name: '模型製作', en: 'Model Maker' },
      { id: 'scout_ins_multimedia_designer', name: '多媒體創作', en: 'Multimedia Designer' },
      { id: 'scout_ins_observer', name: '觀察', en: 'Observer' },
      { id: 'scout_ins_orienteer', name: '野外定向', en: 'Orienteer' },
      { id: 'scout_ins_photographer', name: '攝影', en: 'Photographer' },
      { id: 'scout_ins_pioneer', name: '先鋒工程', en: 'Pioneer' },
      { id: 'scout_ins_programmer', name: '編程', en: 'Programmer' },
      { id: 'scout_ins_sailor', name: '風帆', en: 'Sailor' },
      { id: 'scout_ins_swimmer', name: '游泳', en: 'Swimmer' },
      { id: 'scout_ins_tree_carer', name: '樹木護理', en: 'Tree Carer' },
    ],
  },
];

/* ══════════════════════════════════════════════════════════
   其他獎章及徽章（兩個支部都可能想考）
   ══════════════════════════════════════════════════════════ */

const CUB_OTHERS: BadgeCategory[] = [
  {
    id: 'cub_other', title: '其他徽章', desc: '非活動徽章，但幼童軍亦可考取',
    items: [
      { id: 'cub_scout_link', name: '童軍先修章', en: 'Scout Link Badge', },
    ],
  },
];

/* 其他獎章及徽章 —— 按《童軍訓練綱要》「其他奬章及徽章」一節，再分類 */
const SCOUT_OTHERS: BadgeCategory[] = [
  {
    id: 'scout_other_world', title: '世界童軍主題章', desc: '世界童軍運動組織（WOSM）推行的主題章',
    items: [
      { id: 'scout_mop', name: '和平使者章', en: 'Messengers of Peace' },
      { id: 'scout_plastic_tide', name: '走塑達人章', en: 'Plastic Tide Turners' },
      { id: 'scout_champions_nature', name: '自然守護者章', en: 'Champions for Nature' },
      { id: 'scout_go_solar', name: '日光善用者章', en: 'Scouts Go Solar' },
      { id: 'scout_green_pioneer', name: '環保先鋒章', en: 'Green Pioneer Badge' },
    ],
  },
  {
    id: 'scout_other_civic', title: '公民及社會意識章', desc: '社區參與、安全及公民教育類',
    items: [
      { id: 'scout_active_citizen', name: '「積極公民」獎章系列', en: 'Active Citizenship Badge Series' },
      { id: 'scout_community_involvement', name: '社區參與章', en: 'Community Involvement Badge' },
      { id: 'scout_anti_deception', name: '防騙先鋒章', en: 'Anti-Deception Badge' },
      { id: 'scout_child_protection', name: '保護兒童章', en: 'Child Protection Badge' },
      { id: 'scout_anti_drug', name: '禁毒章', en: 'Anti-Drug Badge' },
      { id: 'scout_cer', name: '社區應急先鋒章', en: 'Community Emergency Responder Badge' },
    ],
  },
  {
    id: 'scout_other_service', title: '服務及領導', desc: '小隊服務、領導訓練相關',
    items: [
      { id: 'scout_service_flash', name: '服務獎章', en: 'Service Flash' },
      { id: 'scout_leadership_award', name: '領導才獎章', en: 'Leadership Award' },
      { id: 'scout_patrol_woggle', name: '小隊活動巾圈', en: 'Patrol Activity Woggle' },
    ],
  },
  {
    id: 'scout_other_link', title: '宗教及銜接', desc: '宗教章、升支部銜接及外部獎勵計劃',
    items: [
      { id: 'scout_religious', name: '宗教章', en: 'Religious Badge' },
      { id: 'scout_venture_link', name: '深資童軍先修章', en: 'Venture Scout Link Badge' },
      { id: 'scout_ayp', name: '香港青年獎勵計劃', en: 'The Hong Kong Award for Young People' },
    ],
  },
  {
    id: 'scout_other_sea', title: '海上活動徽章', desc: '海童軍／海上活動專項（非專科徽章）',
    items: [
      { id: 'scout_sea_oarsman', name: '艇工', en: 'Oarsman' },
      { id: 'scout_sea_boatman', name: '水手', en: 'Boatman' },
      { id: 'scout_sea_boatswain', name: '水手長', en: 'Boatswain' },
    ],
  },
  {
    id: 'scout_other_air', title: '航空活動徽章', desc: '空童軍／航空活動專項（非專科徽章）',
    items: [
      { id: 'scout_air_basic', name: '初級航空活動', en: 'Basic Air Activity Badge' },
      { id: 'scout_air_intermediate', name: '中級航空活動', en: 'Intermediate Air Activity Badge' },
      { id: 'scout_air_advanced', name: '高級航空活動', en: 'Advanced Air Activity Badge' },
    ],
  },
];

/** 有「想考的章」選單嘅支部 */
export const BADGE_SCHEMES: Record<string, BadgeScheme> = {
  b2: {
    branchId: 'b2',
    branchName: '幼童軍支部',
    schemeName: '幼童軍活動徽章',
    source: '香港童軍總會《幼童軍訓練綱要》（2025 年 8 月網上版）',
    categories: CUB_CATEGORIES,
    others: CUB_OTHERS,
  },
  b3: {
    branchId: 'b3',
    branchName: '童軍支部',
    schemeName: '童軍專科徽章',
    source: '香港童軍總會《童軍訓練綱要》（含 2026 年 1 月專科徽章更新）',
    categories: SCOUT_CATEGORIES,
    others: SCOUT_OTHERS,
  },
};

/** 呢個支部有冇「想考的章」選單 */
export function badgeSchemeFor(branchId?: string): BadgeScheme | null {
  return (branchId && BADGE_SCHEMES[branchId]) || null;
}

/** 由已儲存嘅 id 字串還原做 { id, name, group } 清單 */
export function parseWantedBadges(
  raw: string | undefined,
  scheme: BadgeScheme | null
): { id: string; name: string; group: string }[] {
  const ids = String(raw || '')
    .split(/[|,;]/)
    .map(x => x.trim())
    .filter(Boolean);
  if (!ids.length || !scheme) return ids.map(id => ({ id, name: id, group: '' }));
  const all = [...scheme.categories, ...scheme.others];
  return ids.map(id => {
    for (const c of all) {
      const hit = c.items.find(i => i.id === id);
      if (hit) return { id, name: hit.name, group: c.title };
    }
    return { id, name: id, group: '' };
  });
}
