import { useEffect, useState } from "react";
import { Provider } from "jotai";
import { createHashRouter, RouterProvider } from "react-router-dom";
import Questions from "./routes/Questions.tsx";
import Config from "./routes/Config.tsx";
import History from "./routes/History.tsx";
import "./app.css";

function getSystemTheme(): string {
  if (typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches) {
    return "AUQ dark";
  }
  return "AUQ light";
}

function useTheme() {
  const [theme, setTheme] = useState<string>(getSystemTheme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) => {
      setTheme(e.matches ? "AUQ dark" : "AUQ light");
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  return { theme, setTheme };
}
const router = createHashRouter([
  {
    path: "/",
    element: <Questions />,
  },
  {
    path: "/config",
    element: <Config />,
  },
  {
    path: "/history",
    element: <History />,
  },
]);

export default function App() {
  useTheme();
  return (
    <Provider>
      <RouterProvider router={router} />
    </Provider>
  );
}