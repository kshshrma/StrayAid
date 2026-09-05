export interface ChatOption {
  id: string;
  label: string;
  nextStep?: string;
  action?: "send_current_location" | "prompt_manual_location" | "get_directions" | "prompt_photo_upload" | "contact_ngo" | "navigate_guardian" | "show_donation_info" | "main_menu";
  rescueType?: "injured_animal" | "trapped_animal" | "weak_abandoned_baby";
  subType?: string;
  inDanger?: boolean;
}

export interface ChatStep {
  id: string;
  message: string | ((context: { ngoName: string; ngoLocation?: string }) => string);
  options: ChatOption[];
}

export const CHATBOT_FLOW_CONFIG: Record<string, ChatStep> = {
  // 1. Initial Main Menu
  MAIN_MENU: {
    id: "MAIN_MENU",
    message: "Hi! 👋 Welcome to StrayAid.\n\nHow can we help you today?",
    options: [
      { id: "opt_rescue", label: "🚑 Rescue an Animal", nextStep: "RESCUE_STEP1" },
      { id: "opt_adopt", label: "🏠 Adopt an Animal", nextStep: "ADOPT_STEP1" },
      { id: "opt_volunteer", label: "🤝 Volunteer", nextStep: "VOLUNTEER_STEP1" },
      { id: "opt_donate", label: "💰 Donate", nextStep: "DONATE_STEP1" },
    ],
  },

  // 2. Rescue Flow - Step 1
  RESCUE_STEP1: {
    id: "RESCUE_STEP1",
    message: "I can help. What happened?",
    options: [
      { id: "opt_injured", label: "🩹 Injured Animal", nextStep: "INJURED_STEP1" },
      { id: "opt_trapped", label: "🐾 Trapped Animal", nextStep: "TRAPPED_STEP1" },
      { id: "opt_baby", label: "🐣 Weak/Abandoned Baby", nextStep: "BABY_STEP1" },
      { id: "opt_mm_rescue", label: "🏠 Main Menu", nextStep: "MAIN_MENU" },
    ],
  },

  // 3. Injured Animal Flow
  INJURED_STEP1: {
    id: "INJURED_STEP1",
    message: "Please avoid moving the animal unnecessarily.",
    options: [
      { id: "opt_share_loc_inj", label: "📍 Share Location", nextStep: "LOCATION_PROMPT_INJURED" },
      { id: "opt_self_trans", label: "🚗 I Can Take It Myself", nextStep: "SELF_TRANSPORT" },
      { id: "opt_mm_inj", label: "🏠 Main Menu", nextStep: "MAIN_MENU" },
    ],
  },

  LOCATION_PROMPT_INJURED: {
    id: "LOCATION_PROMPT_INJURED",
    message: "How would you like to share the location?",
    options: [
      {
        id: "opt_gps_inj",
        label: "📍 Send My Current Location",
        action: "send_current_location",
        rescueType: "injured_animal",
      },
      {
        id: "opt_manual_inj",
        label: "🗺️ Enter Location Manually",
        action: "prompt_manual_location",
        rescueType: "injured_animal",
      },
      { id: "opt_mm_loc_inj", label: "🏠 Main Menu", nextStep: "MAIN_MENU" },
    ],
  },

  SELF_TRANSPORT: {
    id: "SELF_TRANSPORT",
    message: ({ ngoName, ngoLocation }) =>
      `Thank you! ❤️\n\nYou can bring the animal directly to:\n\n📍 ${ngoName}${ngoLocation ? `\n(${ngoLocation})` : ""}`,
    options: [
      { id: "opt_get_dir", label: "🗺️ Get Directions", action: "get_directions" },
      { id: "opt_mm_st", label: "🏠 Main Menu", nextStep: "MAIN_MENU" },
    ],
  },

  // 4. Trapped Animal Flow
  TRAPPED_STEP1: {
    id: "TRAPPED_STEP1",
    message: "Where is the animal trapped?",
    options: [
      { id: "opt_drain", label: "🕳️ Drain / Sewer", nextStep: "TRAPPED_LOCATION", subType: "Drain / Sewer" },
      { id: "opt_const", label: "🏗️ Construction Area", nextStep: "TRAPPED_LOCATION", subType: "Construction Area" },
      { id: "opt_bldg", label: "🏠 Building / Room", nextStep: "TRAPPED_LOCATION", subType: "Building / Room" },
      { id: "opt_other_trap", label: "🌳 Other", nextStep: "TRAPPED_LOCATION", subType: "Other Location" },
    ],
  },

  TRAPPED_LOCATION: {
    id: "TRAPPED_LOCATION",
    message: "📍 Please share the animal's location.",
    options: [
      {
        id: "opt_gps_trap",
        label: "📍 Send My Location",
        action: "send_current_location",
        rescueType: "trapped_animal",
      },
      {
        id: "opt_manual_trap",
        label: "🗺️ Enter Manually",
        action: "prompt_manual_location",
        rescueType: "trapped_animal",
      },
      { id: "opt_mm_trap", label: "🏠 Main Menu", nextStep: "MAIN_MENU" },
    ],
  },

  // 5. Weak / Abandoned Baby Animal Flow
  BABY_STEP1: {
    id: "BABY_STEP1",
    message: "Is the baby currently in danger?",
    options: [
      { id: "opt_baby_danger_yes", label: "🚨 Yes", nextStep: "BABY_DANGER_LOCATION" },
      { id: "opt_baby_danger_no", label: "🟢 No", nextStep: "BABY_NOT_DANGER" },
      { id: "opt_mm_baby", label: "🏠 Main Menu", nextStep: "MAIN_MENU" },
    ],
  },

  BABY_DANGER_LOCATION: {
    id: "BABY_DANGER_LOCATION",
    message: "📍 Please share the location.",
    options: [
      {
        id: "opt_gps_baby_dang",
        label: "📍 Send My Location",
        action: "send_current_location",
        rescueType: "weak_abandoned_baby",
        inDanger: true,
      },
      {
        id: "opt_man_baby_dang",
        label: "🗺️ Enter Manually",
        action: "prompt_manual_location",
        rescueType: "weak_abandoned_baby",
        inDanger: true,
      },
      { id: "opt_mm_bbd", label: "🏠 Main Menu", nextStep: "MAIN_MENU" },
    ],
  },

  BABY_NOT_DANGER: {
    id: "BABY_NOT_DANGER",
    message: "Please avoid moving the baby unnecessarily.",
    options: [
      { id: "opt_share_loc_bbnd", label: "📍 Share Location", nextStep: "LOCATION_PROMPT_BABY" },
      {
        id: "opt_send_photo_bbnd",
        label: "📷 Send Photo",
        action: "prompt_photo_upload",
        rescueType: "weak_abandoned_baby",
        inDanger: false,
      },
      { id: "opt_mm_bbnd", label: "🏠 Main Menu", nextStep: "MAIN_MENU" },
    ],
  },

  LOCATION_PROMPT_BABY: {
    id: "LOCATION_PROMPT_BABY",
    message: "How would you like to share the location?",
    options: [
      {
        id: "opt_gps_bb",
        label: "📍 Send My Location",
        action: "send_current_location",
        rescueType: "weak_abandoned_baby",
        inDanger: false,
      },
      {
        id: "opt_man_bb",
        label: "🗺️ Enter Manually",
        action: "prompt_manual_location",
        rescueType: "weak_abandoned_baby",
        inDanger: false,
      },
      { id: "opt_mm_lbb", label: "🏠 Main Menu", nextStep: "MAIN_MENU" },
    ],
  },

  // 6. Adoption Flow
  ADOPT_STEP1: {
    id: "ADOPT_STEP1",
    message: "Hi! ❤️ We'd love to help you find a companion.\n\nWhat are you interested in?",
    options: [
      { id: "opt_dog", label: "🐕 Dog", nextStep: "ADOPT_LOCATION" },
      { id: "opt_cat", label: "🐈 Cat", nextStep: "ADOPT_LOCATION" },
      { id: "opt_any_pet", label: "🐾 Any Animal", nextStep: "ADOPT_LOCATION" },
      { id: "opt_mm_adopt", label: "🏠 Main Menu", nextStep: "MAIN_MENU" },
    ],
  },

  ADOPT_LOCATION: {
    id: "ADOPT_LOCATION",
    message: "Where would you like to adopt from?",
    options: [
      { id: "opt_near_me", label: "📍 Near Me", nextStep: "ADOPT_SUCCESS" },
      { id: "opt_sel_loc", label: "🗺️ Select Location", nextStep: "ADOPT_SUCCESS" },
      { id: "opt_anywhere", label: "🌎 Anywhere", nextStep: "ADOPT_SUCCESS" },
      { id: "opt_mm_adloc", label: "🏠 Main Menu", nextStep: "MAIN_MENU" },
    ],
  },

  ADOPT_SUCCESS: {
    id: "ADOPT_SUCCESS",
    message: ({ ngoName }) =>
      `Great! ❤️ We've recorded your interest with ${ngoName}'s adoption team. A coordinator will share verified animal profiles with you.`,
    options: [
      { id: "opt_contact_adopt", label: "📞 Contact NGO", action: "contact_ngo" },
      { id: "opt_mm_adsucc", label: "🏠 Main Menu", nextStep: "MAIN_MENU" },
    ],
  },

  // 7. Volunteer Flow
  VOLUNTEER_STEP1: {
    id: "VOLUNTEER_STEP1",
    message: "That's wonderful! 🐾\n\nHow would you like to help?",
    options: [
      { id: "opt_vol_rescue", label: "🚑 Rescue", nextStep: "VOLUNTEER_RESCUE" },
      { id: "opt_vol_foster", label: "🏠 Foster", nextStep: "VOLUNTEER_FOSTER" },
      { id: "opt_vol_aware", label: "📢 Awareness", nextStep: "VOLUNTEER_AWARENESS" },
      { id: "opt_mm_vol", label: "🏠 Main Menu", nextStep: "MAIN_MENU" },
    ],
  },

  VOLUNTEER_RESCUE: {
    id: "VOLUNTEER_RESCUE",
    message: "Rescue volunteers can help nearby animals in need.",
    options: [
      { id: "opt_become_guard", label: "🐾 Become a Guardian", action: "navigate_guardian" },
      { id: "opt_mm_vrec", label: "🏠 Main Menu", nextStep: "MAIN_MENU" },
    ],
  },

  VOLUNTEER_FOSTER: {
    id: "VOLUNTEER_FOSTER",
    message: "Thank you! Foster volunteers temporarily care for animals until permanent help is found.",
    options: [
      { id: "opt_reg_foster", label: "🤝 Register Interest", nextStep: "FOSTER_REGISTERED" },
      { id: "opt_mm_vfost", label: "🏠 Main Menu", nextStep: "MAIN_MENU" },
    ],
  },

  FOSTER_REGISTERED: {
    id: "FOSTER_REGISTERED",
    message: ({ ngoName }) =>
      `Thank you! Your foster interest has been recorded with ${ngoName}. A shelter coordinator will contact you. ❤️`,
    options: [
      { id: "opt_contact_foster", label: "📞 Contact NGO", action: "contact_ngo" },
      { id: "opt_mm_fost_reg", label: "🏠 Main Menu", nextStep: "MAIN_MENU" },
    ],
  },

  VOLUNTEER_AWARENESS: {
    id: "VOLUNTEER_AWARENESS",
    message: "Thank you for helping spread awareness about animal rescue and street dog welfare. ❤️",
    options: [{ id: "opt_mm_vaw", label: "🏠 Main Menu", nextStep: "MAIN_MENU" }],
  },

  // 8. Donate Flow
  DONATE_STEP1: {
    id: "DONATE_STEP1",
    message: "Thank you for supporting animal rescue. ❤️\n\nWhat would you like to support?",
    options: [
      { id: "opt_don_rescue", label: "🚑 Rescue", nextStep: "DONATE_CATEGORY" },
      { id: "opt_don_med", label: "🏥 Medical Care", nextStep: "DONATE_CATEGORY" },
      { id: "opt_don_food", label: "🍖 Food", nextStep: "DONATE_CATEGORY" },
      { id: "opt_don_shelter", label: "🏠 Shelter", nextStep: "DONATE_CATEGORY" },
      { id: "opt_mm_don", label: "🏠 Main Menu", nextStep: "MAIN_MENU" },
    ],
  },

  DONATE_CATEGORY: {
    id: "DONATE_CATEGORY",
    message: "Your support helps rescue organizations continue helping animals. ❤️",
    options: [
      { id: "opt_do_donate", label: "💳 Donate", action: "show_donation_info" },
      { id: "opt_mm_doncat", label: "🏠 Main Menu", nextStep: "MAIN_MENU" },
    ],
  },
};
