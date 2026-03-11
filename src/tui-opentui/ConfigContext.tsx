import React, { createContext, useContext } from "react";

import type { AUQConfig } from "../config/types.js";
import { DEFAULT_CONFIG } from "../config/defaults.js";

interface ConfigContextValue {
  config: AUQConfig;
}

const ConfigContext = createContext<ConfigContextValue>({ config: DEFAULT_CONFIG });

export function ConfigProvider({
  config,
  children,
}: {
  config: AUQConfig;
  children: React.ReactNode;
}) {
  return (
    <ConfigContext.Provider value={{ config }}>
      {children}
    </ConfigContext.Provider>
  );
}

export function useConfig(): AUQConfig {
  return useContext(ConfigContext).config;
}