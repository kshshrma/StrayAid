import type {
  ConnectRequestType,
} from "../../services/connect/connectRequestApi";

export type ChatAction =
  | "send_current_location"
  | "prompt_manual_location"
  | "get_directions"
  | "prompt_photo_upload"
  | "navigate_guardian"
  | "navigate_lost_found"
  | "view_available_animals"
  | "show_donation_info"
  | "call_ngo"
  | "main_menu"
  | "go_back";

export interface ChatOption {
  id: string;
  label: string;
  nextStep?: string;
  action?: ChatAction;
  // Request metadata updates
  requestType?: ConnectRequestType;
  subType?: string;
  trapLocationType?: string;
  inDanger?: boolean;
  animalPreference?: string;
  adoptionType?: "adopt" | "foster" | "learn";
  locationPreference?: string;
  medicalConcern?: string;
  volunteerInterest?: string;
  donationTarget?: string;
  transportMode?: "ngo_transport" | "user_self_transport";
}

export interface ChatStep {
  id: string;
  message:
    | string
    | ((context?: { ngoName?: string; ngoLocation?: string; ngoPhone?: string }) => string);
  options: ChatOption[];
  backStep?: string;
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
  // 1. MAIN MENU
  MAIN_MENU: {
    id: "MAIN_MENU",
    message: "Hi! 👋 Welcome to StrayAid.\n\nHow can we help you today?",
    options: [
      { id: "opt_rescue", label: "🚑 Rescue an Animal", nextStep: "RESCUE", requestType: "rescue" },
      { id: "opt_adopt", label: "🏠 Adopt an Animal", nextStep: "ADOPTION", requestType: "adoption" },
      { id: "opt_medical", label: "🏥 Medical Help", nextStep: "MEDICAL", requestType: "medical" },
      { id: "opt_feeding", label: "🍖 Feeding / Basic Care", nextStep: "FEEDING", requestType: "feeding" },
      { id: "opt_volunteer", label: "🤝 Volunteer", nextStep: "VOLUNTEER", requestType: "volunteer" },
      { id: "opt_donate", label: "💰 Donate", nextStep: "DONATE", requestType: "donation" },
      { id: "opt_enquiry", label: "ℹ️ General Enquiry", nextStep: "GENERAL_ENQUIRY", requestType: "general" },
    ],
  },

  // 2. RESCUE FLOW ROOT
  RESCUE: {
    id: "RESCUE",
    message: "I can help. What happened?",
    backStep: "MAIN_MENU",
    options: [
      { id: "opt_inj", label: "🩹 Injured Animal", nextStep: "RESCUE_INJURED", requestType: "rescue", subType: "injured" },
      { id: "opt_trap", label: "🐾 Trapped Animal", nextStep: "RESCUE_TRAPPED", requestType: "rescue", subType: "trapped" },
      { id: "opt_baby", label: "🐣 Weak/Abandoned Baby", nextStep: "RESCUE_BABY", requestType: "rescue", subType: "weak_or_abandoned_baby" },
      { id: "opt_res_back", label: "🔙 Back", action: "go_back", nextStep: "MAIN_MENU" },
      { id: "opt_res_menu", label: "🏠 Main Menu", action: "main_menu", nextStep: "MAIN_MENU" },
    ],
  },

  // 3. RESCUE — INJURED
  RESCUE_INJURED: {
    id: "RESCUE_INJURED",
    message: "Please avoid moving the animal unnecessarily.",
    backStep: "RESCUE",
    options: [
      {
        id: "opt_share_loc_inj",
        label: "📍 Share Location",
        nextStep: "RESCUE_LOCATION_METHOD",
        requestType: "rescue",
        subType: "injured",
        transportMode: "ngo_transport",
      },
      {
        id: "opt_self_trans",
        label: "🚗 I Can Take It Myself",
        nextStep: "RESCUE_SELF_TRANSPORT",
        requestType: "rescue",
        subType: "injured",
        transportMode: "user_self_transport",
      },
      { id: "opt_inj_back", label: "🔙 Back", action: "go_back", nextStep: "RESCUE" },
      { id: "opt_inj_menu", label: "🏠 Main Menu", action: "main_menu", nextStep: "MAIN_MENU" },
    ],
  },

  // 4. RESCUE — LOCATION METHOD
  RESCUE_LOCATION_METHOD: {
    id: "RESCUE_LOCATION_METHOD",
    message: "How would you like to share the location?",
    backStep: "RESCUE_INJURED",
    options: [
      {
        id: "opt_loc_current",
        label: "📍 Send My Current Location",
        action: "send_current_location",
        requestType: "rescue",
        transportMode: "ngo_transport",
      },
      {
        id: "opt_loc_manual",
        label: "🗺️ Enter Location Manually",
        action: "prompt_manual_location",
        requestType: "rescue",
        transportMode: "ngo_transport",
      },
      { id: "opt_loc_back", label: "🔙 Back", action: "go_back", nextStep: "RESCUE_INJURED" },
    ],
  },

  // 5. RESCUE — SELF TRANSPORT
  RESCUE_SELF_TRANSPORT: {
    id: "RESCUE_SELF_TRANSPORT",
    message: (ctx) =>
      `Thank you! ❤️\n\nYou can bring the animal directly to:\n\n📍 ${
        ctx?.ngoName || "Greater Noida Rescuers"
      }\n${ctx?.ngoLocation || "Greater Noida & NCR"}`,
    backStep: "RESCUE_INJURED",
    options: [
      { id: "opt_get_dirs", label: "🗺️ Get Directions", action: "get_directions" },
      { id: "opt_contact_ngo_self", label: "📞 Contact NGO", action: "call_ngo" },
      { id: "opt_self_menu", label: "🏠 Main Menu", action: "main_menu", nextStep: "MAIN_MENU" },
    ],
  },

  // 6. RESCUE — TRAPPED ANIMAL
  RESCUE_TRAPPED: {
    id: "RESCUE_TRAPPED",
    message: "Where is the animal trapped?",
    backStep: "RESCUE",
    options: [
      {
        id: "opt_trap_drain",
        label: "🕳️ Drain / Sewer",
        nextStep: "RESCUE_TRAPPED_LOCATION",
        requestType: "rescue",
        subType: "trapped",
        trapLocationType: "Drain / Sewer",
      },
      {
        id: "opt_trap_const",
        label: "🏗️ Construction Area",
        nextStep: "RESCUE_TRAPPED_LOCATION",
        requestType: "rescue",
        subType: "trapped",
        trapLocationType: "Construction Area",
      },
      {
        id: "opt_trap_bldg",
        label: "🏠 Building / Room",
        nextStep: "RESCUE_TRAPPED_LOCATION",
        requestType: "rescue",
        subType: "trapped",
        trapLocationType: "Building / Room",
      },
      {
        id: "opt_trap_other",
        label: "🌳 Other",
        nextStep: "RESCUE_TRAPPED_LOCATION",
        requestType: "rescue",
        subType: "trapped",
        trapLocationType: "Other",
      },
      { id: "opt_trap_back", label: "🔙 Back", action: "go_back", nextStep: "RESCUE" },
    ],
  },

  // 7. RESCUE — TRAPPED LOCATION
  RESCUE_TRAPPED_LOCATION: {
    id: "RESCUE_TRAPPED_LOCATION",
    message: "📍 Please share the animal's location.",
    backStep: "RESCUE_TRAPPED",
    options: [
      { id: "opt_trap_loc_cur", label: "📍 Send My Location", action: "send_current_location", requestType: "rescue", subType: "trapped" },
      { id: "opt_trap_loc_man", label: "🗺️ Enter Manually", action: "prompt_manual_location", requestType: "rescue", subType: "trapped" },
      { id: "opt_trap_loc_back", label: "🔙 Back", action: "go_back", nextStep: "RESCUE_TRAPPED" },
    ],
  },

  // 8. RESCUE — WEAK OR ABANDONED BABY
  RESCUE_BABY: {
    id: "RESCUE_BABY",
    message: "Is the baby currently in danger?",
    backStep: "RESCUE",
    options: [
      {
        id: "opt_baby_yes",
        label: "🚨 Yes",
        nextStep: "RESCUE_BABY_DANGER_YES",
        requestType: "rescue",
        subType: "weak_or_abandoned_baby",
        inDanger: true,
      },
      {
        id: "opt_baby_no",
        label: "🟢 No",
        nextStep: "RESCUE_BABY_DANGER_NO",
        requestType: "rescue",
        subType: "weak_or_abandoned_baby",
        inDanger: false,
      },
      { id: "opt_baby_back", label: "🔙 Back", action: "go_back", nextStep: "RESCUE" },
    ],
  },

  // 9. RESCUE — BABY IN DANGER (YES)
  RESCUE_BABY_DANGER_YES: {
    id: "RESCUE_BABY_DANGER_YES",
    message: "📍 Please share the location immediately.",
    backStep: "RESCUE_BABY",
    options: [
      { id: "opt_baby_loc_cur", label: "📍 Send My Location", action: "send_current_location", requestType: "rescue", subType: "weak_or_abandoned_baby", inDanger: true },
      { id: "opt_baby_loc_man", label: "🗺️ Enter Manually", action: "prompt_manual_location", requestType: "rescue", subType: "weak_or_abandoned_baby", inDanger: true },
      { id: "opt_baby_danger_back", label: "🔙 Back", action: "go_back", nextStep: "RESCUE_BABY" },
    ],
  },

  // 10. RESCUE — BABY NOT IN DANGER (NO)
  RESCUE_BABY_DANGER_NO: {
    id: "RESCUE_BABY_DANGER_NO",
    message: "Please avoid moving the baby unnecessarily. The mother might be foraging nearby.",
    backStep: "RESCUE_BABY",
    options: [
      { id: "opt_baby_no_loc", label: "📍 Share Location", nextStep: "RESCUE_LOCATION_METHOD", requestType: "rescue", subType: "weak_or_abandoned_baby", inDanger: false },
      { id: "opt_baby_no_photo", label: "📷 Send Photo", action: "prompt_photo_upload", requestType: "rescue", subType: "weak_or_abandoned_baby", inDanger: false },
      { id: "opt_baby_no_back", label: "🔙 Back", action: "go_back", nextStep: "RESCUE_BABY" },
    ],
  },

  // 11. ADOPTION FLOW
  ADOPTION: {
    id: "ADOPTION",
    message: "Wonderful! ❤️\n\nWhat are you looking for?",
    backStep: "MAIN_MENU",
    options: [
      { id: "opt_ad_dog", label: "🐕 Dog", nextStep: "ADOPTION_TYPE", requestType: "adoption", animalPreference: "Dog" },
      { id: "opt_ad_cat", label: "🐈 Cat", nextStep: "ADOPTION_TYPE", requestType: "adoption", animalPreference: "Cat" },
      { id: "opt_ad_bird", label: "🐦 Bird", nextStep: "ADOPTION_TYPE", requestType: "adoption", animalPreference: "Bird" },
      { id: "opt_ad_any", label: "🐾 Any Animal", nextStep: "ADOPTION_TYPE", requestType: "adoption", animalPreference: "Any Animal" },
      { id: "opt_ad_back", label: "🔙 Back", action: "go_back", nextStep: "MAIN_MENU" },
    ],
  },

  ADOPTION_TYPE: {
    id: "ADOPTION_TYPE",
    message: "What kind of adoption are you interested in?",
    backStep: "ADOPTION",
    options: [
      { id: "opt_ad_type_adopt", label: "🏡 Adopt", nextStep: "ADOPTION_LOCATION", requestType: "adoption", adoptionType: "adopt" },
      { id: "opt_ad_type_foster", label: "🐕 Foster", nextStep: "ADOPTION_LOCATION", requestType: "adoption", adoptionType: "foster" },
      { id: "opt_ad_type_learn", label: "🤷 Learn About Adoption", nextStep: "ADOPTION_LEARN" },
      { id: "opt_ad_type_back", label: "🔙 Back", action: "go_back", nextStep: "ADOPTION" },
    ],
  },

  ADOPTION_LEARN: {
    id: "ADOPTION_LEARN",
    message: "Adopting is a lifetime commitment to care, nourish, and protect a loving companion.\n\nOur rescue team provides health records, vaccinations, and initial settling-in guidance.",
    backStep: "ADOPTION_TYPE",
    options: [
      { id: "opt_learn_proceed", label: "🏡 Proceed to Adopt", nextStep: "ADOPTION_LOCATION" },
      { id: "opt_learn_menu", label: "🏠 Main Menu", action: "main_menu", nextStep: "MAIN_MENU" },
    ],
  },

  ADOPTION_LOCATION: {
    id: "ADOPTION_LOCATION",
    message: "Great! 🐾\n\nBefore we show available animals, what is your preferred location?",
    backStep: "ADOPTION_TYPE",
    options: [
      { id: "opt_ad_loc_cur", label: "📍 Use My Location", action: "send_current_location", nextStep: "ADOPTION_RESULTS", requestType: "adoption", locationPreference: "Current Location" },
      { id: "opt_ad_loc_city", label: "🗺️ Enter City", action: "prompt_manual_location", nextStep: "ADOPTION_RESULTS", requestType: "adoption" },
      { id: "opt_ad_loc_any", label: "🌎 Anywhere", nextStep: "ADOPTION_RESULTS", requestType: "adoption", locationPreference: "Anywhere" },
      { id: "opt_ad_loc_back", label: "🔙 Back", action: "go_back", nextStep: "ADOPTION_TYPE" },
    ],
  },

  ADOPTION_RESULTS: {
    id: "ADOPTION_RESULTS",
    message: "Here are animals available for adoption near you. Our adoption coordinator will review your request shortly.",
    backStep: "ADOPTION_LOCATION",
    options: [
      { id: "opt_ad_view_animals", label: "🐾 View Available Animals", action: "view_available_animals" },
      { id: "opt_ad_call_ngo", label: "📞 Contact Rescue Team", action: "call_ngo" },
      { id: "opt_ad_menu", label: "🏠 Main Menu", action: "main_menu", nextStep: "MAIN_MENU" },
    ],
  },

  // 12. MEDICAL HELP FLOW
  MEDICAL: {
    id: "MEDICAL",
    message: "What kind of medical help do you need?",
    backStep: "MAIN_MENU",
    options: [
      { id: "opt_med_inj", label: "🩹 Animal Is Injured", nextStep: "RESCUE_INJURED", requestType: "medical", medicalConcern: "Injured Animal" },
      { id: "opt_med_sick", label: "🩺 Animal Looks Sick", nextStep: "MEDICAL_SICK", requestType: "medical", medicalConcern: "Animal Looks Sick" },
      { id: "opt_med_medication", label: "💊 Medication Question", nextStep: "MEDICAL_MEDICATION", requestType: "medical", medicalConcern: "Medication Question" },
      { id: "opt_med_vet", label: "🏥 Find Veterinary Help", nextStep: "MEDICAL_FIND_VET", requestType: "medical", medicalConcern: "Find Veterinary Help" },
      { id: "opt_med_emerg", label: "🚨 Medical Emergency", nextStep: "MEDICAL_EMERGENCY", requestType: "medical", medicalConcern: "Medical Emergency", inDanger: true },
      { id: "opt_med_back", label: "🔙 Back", action: "go_back", nextStep: "MAIN_MENU" },
    ],
  },

  MEDICAL_SICK: {
    id: "MEDICAL_SICK",
    message: "If the animal is lethargic, vomiting, refusing food, or has nasal/eye discharge, supportive veterinary care is recommended.\n\nWould you like help with:",
    backStep: "MEDICAL",
    options: [
      { id: "opt_sick_find_vet", label: "🏥 Find Veterinary Help", nextStep: "MEDICAL_FIND_VET" },
      { id: "opt_sick_req_rescue", label: "🚑 Request Rescue", nextStep: "RESCUE_LOCATION_METHOD", requestType: "rescue", subType: "injured" },
      { id: "opt_sick_back", label: "🔙 Back", action: "go_back", nextStep: "MEDICAL" },
    ],
  },

  MEDICAL_MEDICATION: {
    id: "MEDICAL_MEDICATION",
    message: "⚠️ Never give human pain medications (like Paracetamol or Ibuprofen) to stray dogs or cats — they are lethal to animals.\n\nPlease consult a licensed veterinarian for safe prescription guidance.",
    backStep: "MEDICAL",
    options: [
      { id: "opt_med_find_vet", label: "🏥 Find Veterinary Help", nextStep: "MEDICAL_FIND_VET" },
      { id: "opt_med_med_back", label: "🔙 Back", action: "go_back", nextStep: "MEDICAL" },
    ],
  },

  MEDICAL_FIND_VET: {
    id: "MEDICAL_FIND_VET",
    message: "We connect you with partner veterinary clinics and 24/7 animal medical centers.",
    backStep: "MEDICAL",
    options: [
      { id: "opt_vet_share_loc", label: "📍 Share Location to Find Nearest Vet", action: "send_current_location", requestType: "medical" },
      { id: "opt_vet_helpline", label: "📞 Emergency Helplines", action: "call_ngo" },
      { id: "opt_vet_menu", label: "🏠 Main Menu", action: "main_menu", nextStep: "MAIN_MENU" },
    ],
  },

  MEDICAL_EMERGENCY: {
    id: "MEDICAL_EMERGENCY",
    message: "🚨 This may require immediate veterinary attention.\n\nIf the animal is unconscious, struggling to breathe, bleeding heavily, or has suffered a serious accident, seek emergency veterinary care immediately.\n\nWould you like help with:",
    backStep: "MEDICAL",
    options: [
      { id: "opt_emerg_find_vet", label: "📍 Find Nearby Veterinary Help", nextStep: "MEDICAL_FIND_VET" },
      { id: "opt_emerg_req_rescue", label: "🚑 Request Rescue", nextStep: "RESCUE_LOCATION_METHOD", requestType: "rescue", subType: "injured", inDanger: true },
      { id: "opt_emerg_contact_team", label: "📞 Contact Rescue Team", action: "call_ngo" },
      { id: "opt_emerg_back", label: "🔙 Back", action: "go_back", nextStep: "MEDICAL" },
    ],
  },

  // 13. FEEDING & BASIC CARE
  FEEDING: {
    id: "FEEDING",
    message: "What do you need help with?",
    backStep: "MAIN_MENU",
    options: [
      { id: "opt_feed_what", label: "🍖 What Can I Feed?", nextStep: "FEEDING_FOOD" },
      { id: "opt_feed_water", label: "💧 Water / Hydration", nextStep: "FEEDING_WATER" },
      { id: "opt_feed_shelter", label: "🏠 Temporary Shelter", nextStep: "FEEDING_SHELTER" },
      { id: "opt_feed_care", label: "🐕 Basic Animal Care", nextStep: "FEEDING_CARE" },
      { id: "opt_feed_guidance", label: "📞 Rescue Guidance", nextStep: "FEEDING_RESCUE" },
      { id: "opt_feed_back", label: "🔙 Back", action: "go_back", nextStep: "MAIN_MENU" },
    ],
  },

  FEEDING_FOOD: {
    id: "FEEDING_FOOD",
    message: "Boiled rice, boiled eggs, cooked chicken (no spices/onions), puppy kibbles, or plain rotis soaked in milk/water are safe.\n\n❌ Avoid chocolate, onions, garlic, grapes, and cooked bones.",
    backStep: "FEEDING",
    options: [
      { id: "opt_food_med", label: "🏥 Medical Help", nextStep: "MEDICAL" },
      { id: "opt_food_res", label: "🚑 Request Rescue", nextStep: "RESCUE" },
      { id: "opt_food_back", label: "🔙 Back", action: "go_back", nextStep: "FEEDING" },
    ],
  },

  FEEDING_WATER: {
    id: "FEEDING_WATER",
    message: "Providing clean drinking water in clean clay bowls is one of the most effective ways to save stray animals in heat.\n\nIf the animal is dehydrated or collapsed, seek veterinary help immediately.",
    backStep: "FEEDING",
    options: [
      { id: "opt_water_med", label: "🏥 Medical Help", nextStep: "MEDICAL" },
      { id: "opt_water_res", label: "🚑 Request Rescue", nextStep: "RESCUE" },
      { id: "opt_water_back", label: "🔙 Back", action: "go_back", nextStep: "FEEDING" },
    ],
  },

  FEEDING_SHELTER: {
    id: "FEEDING_SHELTER",
    message: "Clean cardboard boxes lined with dry jute bags provide excellent temporary warmth in winter or monsoon rain.\n\nEnsure the shelter is placed safely away from vehicle traffic.",
    backStep: "FEEDING",
    options: [
      { id: "opt_shelter_back", label: "🔙 Back", action: "go_back", nextStep: "FEEDING" },
      { id: "opt_shelter_menu", label: "🏠 Main Menu", action: "main_menu", nextStep: "MAIN_MENU" },
    ],
  },

  FEEDING_CARE: {
    id: "FEEDING_CARE",
    message: "Gentle observation without agitation is key. If an animal appears severely ill, injured, or unable to drink/walk, please request emergency rescue.",
    backStep: "FEEDING",
    options: [
      { id: "opt_care_res", label: "🚑 Request Rescue", nextStep: "RESCUE" },
      { id: "opt_care_back", label: "🔙 Back", action: "go_back", nextStep: "FEEDING" },
    ],
  },

  FEEDING_RESCUE: {
    id: "FEEDING_RESCUE",
    message: "Providing clean drinking water is generally helpful.\n\nIf the animal appears severely ill, injured, unconscious, or unable to eat/drink normally, please seek veterinary assistance.",
    backStep: "FEEDING",
    options: [
      { id: "opt_res_guide_med", label: "🏥 Medical Help", nextStep: "MEDICAL" },
      { id: "opt_res_guide_res", label: "🚑 Request Rescue", nextStep: "RESCUE" },
      { id: "opt_res_guide_back", label: "🔙 Back", action: "go_back", nextStep: "FEEDING" },
    ],
  },

  // 14. VOLUNTEER FLOW
  VOLUNTEER: {
    id: "VOLUNTEER",
    message: "That's wonderful! 🐾\n\nHow would you like to help?",
    backStep: "MAIN_MENU",
    options: [
      { id: "opt_vol_rescue", label: "🚑 Rescue Volunteer", nextStep: "VOLUNTEER_REGISTER", requestType: "volunteer", volunteerInterest: "Rescue Volunteer" },
      { id: "opt_vol_foster", label: "🏠 Foster Animals", nextStep: "VOLUNTEER_REGISTER", requestType: "volunteer", volunteerInterest: "Foster Animals" },
      { id: "opt_vol_feeding", label: "🍖 Feeding", nextStep: "VOLUNTEER_REGISTER", requestType: "volunteer", volunteerInterest: "Feeding" },
      { id: "opt_vol_lost", label: "📸 Help With Lost & Found", nextStep: "VOLUNTEER_REGISTER", requestType: "volunteer", volunteerInterest: "Lost & Found" },
      { id: "opt_vol_aware", label: "📢 Spread Awareness", nextStep: "VOLUNTEER_REGISTER", requestType: "volunteer", volunteerInterest: "Spread Awareness" },
      { id: "opt_vol_online", label: "💻 Help Online", nextStep: "VOLUNTEER_REGISTER", requestType: "volunteer", volunteerInterest: "Help Online" },
      { id: "opt_vol_back", label: "🔙 Back", action: "go_back", nextStep: "MAIN_MENU" },
    ],
  },

  VOLUNTEER_REGISTER: {
    id: "VOLUNTEER_REGISTER",
    message: "Would you like to register as a StrayAid volunteer? Rescue volunteers join the verified Guardian network to receive automated rescue dispatches.",
    backStep: "VOLUNTEER",
    options: [
      { id: "opt_vol_reg_btn", label: "🤝 Register as Guardian", action: "navigate_guardian", requestType: "volunteer" },
      { id: "opt_vol_info_btn", label: "ℹ️ Learn More", nextStep: "VOLUNTEER_INFO" },
      { id: "opt_vol_reg_back", label: "🔙 Back", action: "go_back", nextStep: "VOLUNTEER" },
    ],
  },

  VOLUNTEER_INFO: {
    id: "VOLUNTEER_INFO",
    message: "StrayAid Guardians receive automated geofenced alerts when injured or trapped animals need rescue nearby.\n\nVerified Guardians can accept assignments, log status updates, and coordinate with partner shelters.",
    backStep: "VOLUNTEER_REGISTER",
    options: [
      { id: "opt_info_reg_btn", label: "🤝 Register as Guardian", action: "navigate_guardian" },
      { id: "opt_info_menu", label: "🏠 Main Menu", action: "main_menu", nextStep: "MAIN_MENU" },
    ],
  },

  // 15. DONATION FLOW
  DONATE: {
    id: "DONATE",
    message: "Thank you for wanting to support animal rescue. ❤️\n\nWhat would you like to support?",
    backStep: "MAIN_MENU",
    options: [
      { id: "opt_don_rescue", label: "🚑 Rescue Operations", nextStep: "DONATE_CONFIRM", requestType: "donation", donationTarget: "Rescue Operations" },
      { id: "opt_don_med", label: "🏥 Medical Treatment", nextStep: "DONATE_CONFIRM", requestType: "donation", donationTarget: "Medical Treatment" },
      { id: "opt_don_food", label: "🍖 Food", nextStep: "DONATE_CONFIRM", requestType: "donation", donationTarget: "Food" },
      { id: "opt_don_shelter", label: "🏠 Shelter", nextStep: "DONATE_CONFIRM", requestType: "donation", donationTarget: "Shelter" },
      { id: "opt_don_general", label: "❤️ General Support", nextStep: "DONATE_CONFIRM", requestType: "donation", donationTarget: "General Support" },
      { id: "opt_don_back", label: "🔙 Back", action: "go_back", nextStep: "MAIN_MENU" },
    ],
  },

  DONATE_CONFIRM: {
    id: "DONATE_CONFIRM",
    message: "Your support helps verified rescue organizations continue saving and caring for stray animals in distress.",
    backStep: "DONATE",
    options: [
      { id: "opt_don_action_btn", label: "💳 Donate to Organization", action: "show_donation_info" },
      { id: "opt_don_conf_back", label: "🔙 Back", action: "go_back", nextStep: "DONATE" },
      { id: "opt_don_conf_menu", label: "🏠 Main Menu", action: "main_menu", nextStep: "MAIN_MENU" },
    ],
  },

  // 16. GENERAL ENQUIRY
  GENERAL_ENQUIRY: {
    id: "GENERAL_ENQUIRY",
    message: "How can we help you?",
    backStep: "MAIN_MENU",
    options: [
      { id: "opt_gen_rescue", label: "🐾 Animal Rescue", nextStep: "RESCUE", requestType: "rescue" },
      { id: "opt_gen_adopt", label: "🏠 Adoption", nextStep: "ADOPTION", requestType: "adoption" },
      { id: "opt_gen_lost", label: "🔎 Lost & Found", action: "navigate_lost_found" },
      { id: "opt_gen_med", label: "🏥 Medical Help", nextStep: "MEDICAL", requestType: "medical" },
      { id: "opt_gen_vol", label: "🤝 Volunteering", nextStep: "VOLUNTEER", requestType: "volunteer" },
      { id: "opt_gen_don", label: "💰 Donation", nextStep: "DONATE", requestType: "donation" },
      { id: "opt_gen_talk", label: "👤 Talk to Rescue Team", action: "call_ngo" },
      { id: "opt_gen_back", label: "🔙 Back", action: "go_back", nextStep: "MAIN_MENU" },
    ],
  },
};
