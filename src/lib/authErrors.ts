/**
 * Maps Firebase Auth error codes to user-friendly messages.
 */
export const getAuthErrorMessage = (errorCode: string): string => {
  switch (errorCode) {
    // Login & General
    case 'auth/invalid-email':
      return 'The email address is poorly formatted. Please check and try again.';
    case 'auth/user-disabled':
      return 'This user account has been disabled. Please contact support.';
    case 'auth/user-not-found':
      return 'No account found with this email. Please sign up first.';
    case 'auth/wrong-password':
      return 'Incorrect password. Please verify your credentials and try again.';
    case 'auth/too-many-requests':
      return 'Too many failed login attempts. Your account is temporarily locked for security. Please try again later.';
    
    // Signup
    case 'auth/email-already-in-use':
      return 'This email is already associated with an account. Try signing in instead.';
    case 'auth/weak-password':
      return 'The password is too weak. Please use at least 6 characters with a mix of symbols.';
    case 'auth/operation-not-allowed':
      return 'Email and password authentication is not enabled for this project.';
    
    // Popup/Social
    case 'auth/popup-closed-by-user':
      return 'The authentication window was closed before completion. Please try again.';
    case 'auth/cancelled-popup-request':
      return 'Only one popup request is allowed at a time. Please wait or refresh.';
    
    // System/Network
    case 'auth/network-request-failed':
      return 'A network error occurred. Please check your internet connection.';
    case 'auth/internal-error':
      return 'An internal system error occurred. Our engineers are notified. Please try again later.';
    
    default:
      return 'An unexpected authentication error occurred. Please try again.';
  }
};
