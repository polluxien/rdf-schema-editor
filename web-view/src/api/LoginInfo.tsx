import React from "react";
import type { LoginType } from "../../../sharedTypes/loginTypes"

interface LoginContextType {
  loginInfo: LoginType | false | undefined;
  setLoginInfo: (loginInfo: LoginType | false) => void;
}

// export only for provider
export const LoginContext = React.createContext<LoginContextType>(
  {} as LoginContextType,
);

// export for consumers
export const useLoginContext = () => React.useContext(LoginContext);
