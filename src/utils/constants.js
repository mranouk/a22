// src/utils/constants.js

// ALL USER ROLES
const ROLES = [
  { key: 'buyer', label: 'Buyer', emoji: '🛒' },
  { key: 'vendor', label: 'Vendor', emoji: '🏪' },
  { key: 'caller', label: 'Caller', emoji: '📞' }
  // Add/expand as per your app
]

// SECTOR LIST
const SECTORS = [
  { key: 'tech', label: 'Tech', emoji: '💻' },
  { key: 'finance', label: 'Finance', emoji: '💸' },
  { key: 'health', label: 'Health', emoji: '🩺' }
  // Expand as needed
]

// EXPERIENCE LEVELS
const EXPERIENCE_LEVELS = [
  { key: 'junior', label: 'Junior', emoji: '🌱' },
  { key: 'mid', label: 'Mid', emoji: '🌿' },
  { key: 'senior', label: 'Senior', emoji: '🌳' }
]

// GENDER OPTIONS
const GENDERS = [
  { key: 'male', label: 'Male', emoji: '♂️' },
  { key: 'female', label: 'Female', emoji: '♀️' },
  { key: 'other', label: 'Other', emoji: '⚧' }
]

// RESTRICTED PROFILE FIELDS
const RESTRICTED_PROFILE_FIELDS = ['sector', 'experience', 'gender']

// BADGE TYPES, STARS, ICONS, ETC. Example:
const BADGE_TYPES = {
  bronze: { emoji: '🥉', color: '#cd7f32' },
  silver: { emoji: '🥈', color: '#c0c0c0' },
  gold: { emoji: '🥇', color: '#ffd700' }
}

const BOOST_PRICE = 10    // Example: 10 USDT per boost
const BOOST_DURATION_HOURS = 24

module.exports = {
  ROLES,
  SECTORS,
  EXPERIENCE_LEVELS,
  GENDERS,
  BADGE_TYPES,
  RESTRICTED_PROFILE_FIELDS,
  BOOST_PRICE,
  BOOST_DURATION_HOURS
}
