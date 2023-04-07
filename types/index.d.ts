export { };

declare global {
    interface Window {
        showMenu: (event: any, corrected: string) => void;
        showMenuPrototype: (event: any, word: string, corrected: string) => void;
    }
}