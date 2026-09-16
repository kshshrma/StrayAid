export type ChatAction =
  | "send_current_location"
  | "prompt_manual_location"
  | "get_directions"
  | "prompt_photo_upload"
  | "navigate_guardian"
  | "show_donation_info"
  | "main_menu"
  | "go_back";

export interface ChatOption {
  id: string;
  label: string;
  nextStep?: string;
  action?: ChatAction;
  rescueType?: "injured_animal" | "trapped_animal" | "weak_abandoned_baby";
  subType?: string;
  inDanger?: boolean;
}

export interface ChatStep {
  id: string;
  message: string | ((context?: { ngoName?: string; ngoLocation?: string }) => string);
  options: ChatOption[];
}

export interface ChatMessage {
  id: string;
  sender: "bot" | "user";
  isOutgoing: boolean;
  text: string;
  time: string;
  options?: ChatOption[];
  isNotice?: boolean;
}

export const CHATBOT_FLOW_CONFIG: Record<string, ChatStep> = {
  // 1. Initial Main Menu
  MAIN_MENU: {
    id: "MAIN_MENU",
    message: "Hi! 👋 Welcome to StrayAid.\n\nHow can we help you today?",
    options: [
      { id: "opt_rescue", label: "🚑 Rescue an Animal", nextStep: "RESCUE" },
      { id: "opt_adopt", label: "🏠 Adopt an Animal", nextStep: "ADOPTION" },
      { id: "opt_volunteer", label: "🤝 Volunteer", nextStep: "VOLUNTEER" },
      { id: "opt_donate", label: "💰 Donate", nextStep: "DONATE" },
    ],
  },

  // 2. Rescue Flow Root
  RESCUE: {
    id: "RESCUE",
    message: "I can help. What happened?",
    options: [
      { id: "opt_injured", label: "🩹 Injured Animal", nextStep: "RESCUE_INJURED" },
      { id: "opt_trapped", label: "🐾 Trapped Animal", nextStep: "RESCUE_TRAPPED" },
      { id: "opt_baby", label: "🐣 Weak/Abandoned Baby", nextStep: "RESCUE_BABY" },
      { id: "opt_rescue_menu", label: "🏠 Main Menu", action: "main_menu", nextStep: "MAIN_MENU" },
    ],
  },

  // 3. Rescue — Injured
  RESCUE_INJURED: {
    id: "RESCUE_INJURED",
    message: "Please avoid moving the animal unnecessarily.",
    options: [
      { id: "opt_share_loc_inj", label: "📍 Share Location", nextStep: "RESCUE_LOCATION_METHOD" },
      { id: "opt_self_trans", label: "🚗 I Can Take It Myself", nextStep: "RESCUE_SELF_TRANSPORT" },
      { id: "opt_inj_menu", label: "🏠 Main Menu", action: "main_menu", nextStep: "MAIN_MENU" },
    ],
  },

  // 4. Share Location Options
  RESCUE_LOCATION_METHOD: {
    id: "RESCUE_LOCATION_METHOD",
    message: "How would you like to share the location?",
    options: [
      {
        id: "opt_gps_current",
        label: "📍 Send My Current Location",
        nextStep: "RESCUE_GPS_PLACEHOLDER",
        action: "send_current_location",
      },
      {
        id: "opt_manual_location",
        label: "🗺️ Enter Location Manually",
        nextStep: "RESCUE_MANUAL_PLACEHOLDER",
        action: "prompt_manual_location",
      },
      { id: "opt_loc_menu", label: "🏠 Main Menu", action: "main_menu", nextStep: "MAIN_MENU" },
    ],
  },

  RESCUE_GPS_PLACEHOLDER: {
    id: "RESCUE_GPS_PLACEHOLDER",
    message: "📍 Location sharing will be connected in the next milestone.",
    options: [
      { id: "opt_gps_ret_menu", label: "🏠 Main Menu", action: "main_menu", nextStep: "MAIN_MENU" },
    ],
  },

  RESCUE_MANUAL_PLACEHOLDER: {
    id: "RESCUE_MANUAL_PLACEHOLDER",
    message: "🗺️ Manual location entry will be connected in the next milestone.",
    options: [
      { id: "opt_man_ret_menu", label: "🏠 Main Menu", action: "main_menu", nextStep: "MAIN_MENU" },
    ],
  },

  // 5. Self Transport
  RESCUE_SELF_TRANSPORT: {
    id: "RESCUE_SELF_TRANSPORT",
    message: (context) =>
      `Thank you! ❤️\n\nYou can bring the animal directly to:\n\n📍 ${context?.ngoName || "Greater Noida Rescuers"}`,
    options: [
      { id: "opt_get_dir", label: "🗺️ Get Directions", action: "get_directions" },
      { id: "opt_trans_menu", label: "🏠 Main Menu", action: "main_menu", nextStep: "MAIN_MENU" },
    ],
  },

  // 6. Trapped Animal
  RESCUE_TRAPPED: {
    id: "RESCUE_TRAPPED",
    message: "Where is the animal trapped?",
    options: [
      { id: "opt_drain", label: "🕳️ Drain / Sewer", nextStep: "RESCUE_TRAPPED_LOCATION", subType: "Drain / Sewer" },
      { id: "opt_const", label: "🏗️ Construction Area", nextStep: "RESCUE_TRAPPED_LOCATION", subType: "Construction Area" },
      { id: "opt_bldg", label: "🏠 Building / Room", nextStep: "RESCUE_TRAPPED_LOCATION", subType: "Building / Room" },
      { id: "opt_other_trap", label: "🌳 Other", nextStep: "RESCUE_TRAPPED_LOCATION", subType: "Other" },
      { id: "opt_trap_menu", label: "🏠 Main Menu", action: "main_menu", nextStep: "MAIN_MENU" },
    ],
  },

  RESCUE_TRAPPED_LOCATION: {
    id: "RESCUE_TRAPPED_LOCATION",
    message: "📍 Please share the animal's location.",
    options: [
      {
        id: "opt_gps_trap",
        label: "📍 Send My Location",
        nextStep: "RESCUE_GPS_PLACEHOLDER",
        action: "send_current_location",
      },
      {
        id: "opt_manual_trap",
        label: "🗺️ Enter Manually",
        nextStep: "RESCUE_MANUAL_PLACEHOLDER",
        action: "prompt_manual_location",
      },
      { id: "opt_traploc_menu", label: "🏠 Main Menu", action: "main_menu", nextStep: "MAIN_MENU" },
    ],
  },

  // 7. Weak / Abandoned Baby
  RESCUE_BABY: {
    id: "RESCUE_BABY",
    message: "Is the baby currently in danger?",
    options: [
      { id: "opt_baby_danger_yes", label: "🚨 Yes", nextStep: "RESCUE_BABY_DANGER" },
      { id: "opt_baby_danger_no", label: "🟢 No", nextStep: "RESCUE_BABY_SAFE" },
      { id: "opt_baby_menu", label: "🏠 Main Menu", action: "main_menu", nextStep: "MAIN_MENU" },
    ],
  },

  RESCUE_BABY_DANGER: {
    id: "RESCUE_BABY_DANGER",
    message: "📍 Please share the location.",
    options: [
      {
        id: "opt_gps_baby_dang",
        label: "📍 Send My Location",
        nextStep: "RESCUE_GPS_PLACEHOLDER",
        action: "send_current_location",
        inDanger: true,
      },
      {
        id: "opt_man_baby_dang",
        label: "🗺️ Enter Manually",
        nextStep: "RESCUE_MANUAL_PLACEHOLDER",
        action: "prompt_manual_location",
        inDanger: true,
      },
      { id: "opt_babydang_menu", label: "🏠 Main Menu", action: "main_menu", nextStep: "MAIN_MENU" },
    ],
  },

  RESCUE_BABY_SAFE: {
    id: "RESCUE_BABY_SAFE",
    message: "Please avoid moving the baby unnecessarily.",
    options: [
      { id: "opt_share_loc_bbsafe", label: "📍 Share Location", nextStep: "RESCUE_BABY_DANGER" },
      {
        id: "opt_send_photo_bb",
        label: "📷 Send Photo",
        nextStep: "RESCUE_PHOTO_PLACEHOLDER",
        action: "prompt_photo_upload",
      },
      { id: "opt_babysafe_menu", label: "🏠 Main Menu", action: "main_menu", nextStep: "MAIN_MENU" },
    ],
  },

  RESCUE_PHOTO_PLACEHOLDER: {
    id: "RESCUE_PHOTO_PLACEHOLDER",
    message: "📷 Photo upload will be connected in the next milestone.",
    options: [
      { id: "opt_photo_ret_menu", label: "🏠 Main Menu", action: "main_menu", nextStep: "MAIN_MENU" },
    ],
  },

  // 8. Adoption Flow
  ADOPTION: {
    id: "ADOPTION",
    message: "Hi! ❤️ We'd love to help you find a companion.\n\nWhat are you interested in?",
    options: [
      { id: "opt_dog", label: "🐕 Dog", nextStep: "ADOPTION_LOCATION" },
      { id: "opt_cat", label: "🐈 Cat", nextStep: "ADOPTION_LOCATION" },
      { id: "opt_any_pet", label: "🐾 Any Animal", nextStep: "ADOPTION_LOCATION" },
      { id: "opt_adopt_menu", label: "🏠 Main Menu", action: "main_menu", nextStep: "MAIN_MENU" },
    ],
  },

  ADOPTION_TYPE: {
    id: "ADOPTION_TYPE",
    message: "Hi! ❤️ We'd love to help you find a companion.\n\nWhat are you interested in?",
    options: [
      { id: "opt_dog_2", label: "🐕 Dog", nextStep: "ADOPTION_LOCATION" },
      { id: "opt_cat_2", label: "🐈 Cat", nextStep: "ADOPTION_LOCATION" },
      { id: "opt_any_pet_2", label: "🐾 Any Animal", nextStep: "ADOPTION_LOCATION" },
      { id: "opt_adopttype_menu", label: "🏠 Main Menu", action: "main_menu", nextStep: "MAIN_MENU" },
    ],
  },

  ADOPTION_LOCATION: {
    id: "ADOPTION_LOCATION",
    message: "Where would you like to adopt from?",
    options: [
      { id: "opt_near_me", label: "📍 Near Me", nextStep: "ADOPTION_SEARCH_PLACEHOLDER" },
      { id: "opt_select_location", label: "🗺️ Select Location", nextStep: "ADOPTION_SEARCH_PLACEHOLDER" },
      { id: "opt_anywhere", label: "🌎 Anywhere", nextStep: "ADOPTION_SEARCH_PLACEHOLDER" },
      { id: "opt_adoptloc_menu", label: "🏠 Main Menu", action: "main_menu", nextStep: "MAIN_MENU" },
    ],
  },

  ADOPTION_SEARCH_PLACEHOLDER: {
    id: "ADOPTION_SEARCH_PLACEHOLDER",
    message: "Adoption search will be connected in a later milestone.",
    options: [
      { id: "opt_adoptsearch_menu", label: "🏠 Main Menu", action: "main_menu", nextStep: "MAIN_MENU" },
    ],
  },

  // 9. Volunteer Flow
  VOLUNTEER: {
    id: "VOLUNTEER",
    message: "That's wonderful! 🐾\n\nHow would you like to help?",
    options: [
      { id: "opt_vol_rescue", label: "🚑 Rescue", nextStep: "VOLUNTEER_RESCUE" },
      { id: "opt_vol_foster", label: "🏠 Foster", nextStep: "VOLUNTEER_PLACEHOLDER" },
      { id: "opt_vol_aware", label: "📢 Awareness", nextStep: "VOLUNTEER_PLACEHOLDER" },
      { id: "opt_vol_menu", label: "🏠 Main Menu", action: "main_menu", nextStep: "MAIN_MENU" },
    ],
  },

  VOLUNTEER_TYPE: {
    id: "VOLUNTEER_TYPE",
    message: "That's wonderful! 🐾\n\nHow would you like to help?",
    options: [
      { id: "opt_vol_rescue_2", label: "🚑 Rescue", nextStep: "VOLUNTEER_RESCUE" },
      { id: "opt_vol_foster_2", label: "🏠 Foster", nextStep: "VOLUNTEER_PLACEHOLDER" },
      { id: "opt_vol_aware_2", label: "📢 Awareness", nextStep: "VOLUNTEER_PLACEHOLDER" },
      { id: "opt_voltype_menu", label: "🏠 Main Menu", action: "main_menu", nextStep: "MAIN_MENU" },
    ],
  },

  VOLUNTEER_RESCUE: {
    id: "VOLUNTEER_RESCUE",
    message: "Rescue volunteers can help nearby animals in need.",
    options: [
      { id: "opt_become_guard", label: "🐾 Become a Guardian", action: "navigate_guardian" },
      { id: "opt_volres_menu", label: "🏠 Main Menu", action: "main_menu", nextStep: "MAIN_MENU" },
    ],
  },

  VOLUNTEER_PLACEHOLDER: {
    id: "VOLUNTEER_PLACEHOLDER",
    message: "Thank you for wanting to help! ❤️ Volunteer coordination will be connected in a later milestone.",
    options: [
      { id: "opt_volhold_menu", label: "🏠 Main Menu", action: "main_menu", nextStep: "MAIN_MENU" },
    ],
  },

  // 10. Donation Flow
  DONATE: {
    id: "DONATE",
    message: "Thank you for supporting animal rescue. ❤️\n\nWhat would you like to support?",
    options: [
      { id: "opt_don_rescue", label: "🚑 Rescue", nextStep: "DONATE_TYPE" },
      { id: "opt_don_medical", label: "🏥 Medical Care", nextStep: "DONATE_TYPE" },
      { id: "opt_don_food", label: "🍖 Food", nextStep: "DONATE_TYPE" },
      { id: "opt_don_shelter", label: "🏠 Shelter", nextStep: "DONATE_TYPE" },
      { id: "opt_don_menu", label: "🏠 Main Menu", action: "main_menu", nextStep: "MAIN_MENU" },
    ],
  },

  DONATE_TYPE: {
    id: "DONATE_TYPE",
    message: "Your support helps rescue organizations continue helping animals. ❤️",
    options: [
      { id: "opt_do_donate", label: "💳 Donate", nextStep: "DONATE_PLACEHOLDER", action: "show_donation_info" },
      { id: "opt_dontype_menu", label: "🏠 Main Menu", action: "main_menu", nextStep: "MAIN_MENU" },
    ],
  },

  DONATE_PLACEHOLDER: {
    id: "DONATE_PLACEHOLDER",
    message: "💳 Donation processing will be connected in a later milestone.",
    options: [
      { id: "opt_donhold_menu", label: "🏠 Main Menu", action: "main_menu", nextStep: "MAIN_MENU" },
    ],
  },
};
