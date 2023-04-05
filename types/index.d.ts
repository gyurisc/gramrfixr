export { };

declare global {
    interface Window {
        showMenu: (event: any, corrected: string) => void;
    }
}