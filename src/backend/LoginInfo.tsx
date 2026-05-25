import React from "react";
import type { LoginResource } from "../types/login";

interface LoginContextType {
  loginInfo: LoginResource | false | undefined;
  setLoginInfo: (loginInfo: LoginResource | false) => void;
}

// export only for provider
export const LoginContext = React.createContext<LoginContextType>(
  {} as LoginContextType,
);

// export for consumers
export const useLoginContext = () => React.useContext(LoginContext);
