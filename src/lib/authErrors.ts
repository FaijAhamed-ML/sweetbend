/**
 * Maps Firebase Auth error codes to user-friendly messages.
 */
export const getAuthErrorMessage = (rawCode: string): string => {
  // Extract error code if it's in the format "Firebase: Error (auth/code)."
  const errorCode = rawCode.includes('(') 
    ? rawCode.match(/\(([^)]+)\)/)?.[1] || rawCode 
    : rawCode.replace('Firebase: Error ', '').replace('.', '').trim();

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
      return 'This authentication method is not enabled. Please contact support.';
    
    // Popup/Social
    case 'auth/popup-closed-by-user':
      return 'The authentication window was closed before completion. Please try again.';
    case 'auth/cancelled-popup-request':
      return 'Only one popup request is allowed at a time. Please wait or refresh.';
    case 'auth/unauthorized-domain':
      return 'This domain is not authorized for authentication. Please add it to the authorized domains list.';
    
    // System/Network
    case 'auth/network-request-failed':
      return 'A network error occurred. Please check your internet connection.';
    case 'auth/internal-error':
      return 'An internal system error occurred. Please try again later.';
    case 'auth/invalid-api-key':
      return 'The provided API key is invalid. Please check your configuration.';
    case 'auth/app-deleted':
      return 'This Firebase app instance has been deleted.';
    case 'auth/configuration-not-found':
      return 'Firebase configuration not found. Please ensure your project is properly initialized.';
    case 'auth/argument-error':
      return 'Authentication failed due to a library configuration error.';
    case 'auth/invalid-credential':
      return 'The credentials used are invalid or expired. Please try signing in again.';
    case 'auth/user-mismatch':
      return 'The provided credentials do not match the currently signed-in user.';
    
    default:
      console.error('Firebase Auth Error:', errorCode, ' (Raw:', rawCode, ')');
      return `An unexpected authentication error occurred (${errorCode}). Please try again.`;
  }
};
