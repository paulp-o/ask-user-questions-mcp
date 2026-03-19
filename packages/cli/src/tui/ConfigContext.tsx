import React, { createContext, useContext } from "react";

import type { AUQConfig } from "@auq/core/config";
import { DEFAULT_CONFIG } from "@auq/core/config";

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