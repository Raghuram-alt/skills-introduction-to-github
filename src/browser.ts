import anime from './index';
declare global { interface Window { anime: typeof anime } }
window.anime = anime;
