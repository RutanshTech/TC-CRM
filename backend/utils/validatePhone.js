/**
 * Validate if a phone number:
 * - Starts with "+"
 * - Followed by 10 to 15 digits
 * - No spaces, dashes, or alphabets
 * 
 * Example of valid: +919876543210
 * 
 * @param {String} number
 * @returns {Boolean}
 */
const validatePhone = (number) => {
    const regex = /^\+\d{10,15}$/;
    return regex.test(number);
  };
  
module.exports = validatePhone;
  