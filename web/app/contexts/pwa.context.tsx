import { PWAInstallElement } from "@khmyznikov/pwa-install";
import { createContext, useCallback, useContext, useMemo, type ReactNode } from "react";

export interface PwaContextValue {
	needsInstall: boolean;
	showInstallTutorial: () => void;
}

const PwaContext = createContext<PwaContextValue | null>(null);

export const PwaProvider = ({ children }: { children: ReactNode }) => {
	const isIos =
		/iPad|iPhone|iPod/.test(navigator.userAgent) ||
		(navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
	const isInstalled = (navigator as Navigator & { standalone?: boolean }).standalone;

	const showInstallTutorial = useCallback(() => {
		document.querySelector<PWAInstallElement>("pwa-install")?.showDialog?.(true);
	}, []);

	const value = useMemo(
		() => ({ needsInstall: isIos && !isInstalled, showInstallTutorial }),
		[isIos, isInstalled, showInstallTutorial]
	);

	return <PwaContext.Provider value={value}>{children}</PwaContext.Provider>;
};

export const usePwa = () => {
	const context = useContext(PwaContext);
	if (!context) throw new Error("PwaProvider Context not found");
	return context;
};
