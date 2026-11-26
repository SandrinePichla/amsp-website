function u(t){if(!t)return null;const e=t.match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/);return e?e[1]:null}export{u as g};
