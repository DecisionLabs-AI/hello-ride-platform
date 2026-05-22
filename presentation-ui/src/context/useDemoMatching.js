import { useContext } from "react";
import { DemoMatchingContext } from "./DemoMatchingContextCore.js";

export function useDemoMatching() {
  const context = useContext(DemoMatchingContext);
  if (!context) {
    throw new Error("useDemoMatching must be used inside DemoMatchingProvider");
  }
  return context;
}
