import util from "util";
import { exec as _exec_callback } from "child_process";
const exec = util.promisify(_exec_callback);

import fs from "fs/promises";
import url from "url";

import prompts from "prompts";
import ProgressBar from "progress";

import { get_playlist_videos_data, video_id_to_url } from "./yt_api.js";

const MUSICS_DIR = url.fileURLToPath(import.meta.resolve("../../musics"));
const MUSIC_DATA_DIR = url.fileURLToPath(import.meta.resolve("../../data/music_data.json"));
const music_filepath = (title: string) => `${MUSICS_DIR}/${title}.mp3`;

const playlists: string[] = [
    "PL2k3Y6tIDA8h5ndpyr3kuFnHrQRLqtAQK"
];

console.log("fetching video data from youtube API...");
let video_data = (await Promise.all(playlists.map(get_playlist_videos_data))).flat();

console.log(`writing music data to ${MUSIC_DATA_DIR}`);
await fs.writeFile(MUSIC_DATA_DIR, "{\"musics\":" + JSON.stringify(video_data.map(data => {
    return { ...data, path: music_filepath(data.title) };
})) + "}");

const answer = await prompts({
    type: "confirm",
    name: "confirmation",
    message: "The next step (creation of .mp3 files) may take up a lot of CPU for a few minutes. Do you wish to proceed?"
});
if (!answer.confirmation) process.exit(0);

const bar = new ProgressBar("[:bar] :current/:total", { total: 0, complete: "#", incomplete: "-", width: process.stdout.getWindowSize()[0] - 16 });

console.log(`creating .mp3 music files in ${MUSICS_DIR}...`);
await Promise.all(video_data.map(async data => {
    bar.total++;
    try {
        await fs.access(music_filepath(data.title));
        bar.tick();
    } catch (err) {
        bar.render();
        // fs.access rejects if the file doesn't exist, which is when we want to run yt-dlp
        await exec(`yt-dlp '${video_id_to_url(data.id)}' -x --audio-format mp3 -o \"${music_filepath(data.title)}\"`);
        bar.tick();
    }
}));
