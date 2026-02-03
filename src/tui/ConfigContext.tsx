import React, { createContext, useContext } from "react";

import type { AUQConfig } from "../config/types.js";
import { DEFAULT_CONFIG } from "../config/defaults.js";

const ConfigContext = createContext<AUQConfig>(DEFAULT_CONFIG);

interface ConfigProviderProps {
  config?: AUQConfig;
  children: React.ReactNode;
}

export const ConfigProvider: React.FC<ConfigProviderProps> = ({
  config,
  children,
}) => {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };
  return (
    <ConfigContext.Provider value={mergedConfig}>
      {children}
    </ConfigContext.Provider>
  );
};

export const useConfig = (): AUQConfig => {
  return useContext(ConfigContext);
};
