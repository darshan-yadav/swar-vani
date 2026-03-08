import { CognitoUserPool, CognitoUser, AuthenticationDetails } from 'amazon-cognito-identity-js';

const USER_POOL_ID = import.meta.env.VITE_COGNITO_USER_POOL_ID || '';
const CLIENT_ID = import.meta.env.VITE_COGNITO_CLIENT_ID || '';

const userPool = new CognitoUserPool({
  UserPoolId: USER_POOL_ID,
  ClientId: CLIENT_ID,
});

export interface AuthSession {
  idToken: string;
  accessToken: string;
  username: string;
  phone: string;
}

export function getCurrentSession(): Promise<AuthSession | null> {
  return new Promise((resolve) => {
    const user = userPool.getCurrentUser();
    if (!user) { resolve(null); return; }
    user.getSession((err: Error | null, session: any) => {
      if (err || !session?.isValid()) { resolve(null); return; }
      resolve({
        idToken: session.getIdToken().getJwtToken(),
        accessToken: session.getAccessToken().getJwtToken(),
        username: user.getUsername(),
        phone: session.getIdToken().payload.phone_number || '',
      });
    });
  });
}

export function login(phone: string, password: string): Promise<AuthSession> {
  return new Promise((resolve, reject) => {
    // Ensure phone has country code
    const fullPhone = phone.startsWith('+') ? phone : `+91${phone}`;
    
    const user = new CognitoUser({ Username: fullPhone, Pool: userPool });
    const authDetails = new AuthenticationDetails({ Username: fullPhone, Password: password });

    user.authenticateUser(authDetails, {
      onSuccess: (session) => {
        resolve({
          idToken: session.getIdToken().getJwtToken(),
          accessToken: session.getAccessToken().getJwtToken(),
          username: user.getUsername(),
          phone: session.getIdToken().payload.phone_number || fullPhone,
        });
      },
      onFailure: (err) => {
        reject(new Error(err.message || 'Login failed'));
      },
      newPasswordRequired: () => {
        reject(new Error('Password change required. Contact admin.'));
      },
    });
  });
}

export function logout(): void {
  const user = userPool.getCurrentUser();
  if (user) user.signOut();
}
