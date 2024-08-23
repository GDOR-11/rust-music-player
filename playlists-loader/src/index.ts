import util from "util";
import { exec as _exec_callback } from "child_process";
const exec = util.promisify(_exec_callback);

import fs from "fs/promises";
import url from "url";

import prompts from "prompts";
import ProgressBar from "progress";

import { get_playlist_videos_data, video_id_to_url, VideoData } from "./yt_api.js";

const MUSICS_DIR = url.fileURLToPath(import.meta.resolve("../../musics"));
const MUSIC_DATA_DIR = url.fileURLToPath(import.meta.resolve("../../data/music_data.json"));
const music_filepath = (title: string) => `${MUSICS_DIR}/${title}.mp3`;

const parallel_mp3_creation = process.argv[2] !== "-no-parallel";

const playlists: string[] = [
    "PL2k3Y6tIDA8h5ndpyr3kuFnHrQRLqtAQK"
];

console.log("fetching video data from youtube API...");
let video_data = (await Promise.all(playlists.map(get_playlist_videos_data))).flat();

console.log(`writing music data to ${MUSIC_DATA_DIR}`);
await fs.writeFile(MUSIC_DATA_DIR, "{\"musics\":" + JSON.stringify(video_data.map(data => {
    return { ...data, path: music_filepath(data.title) };
})) + "}", { flag: "w" });

console.log(`creating .mp3 music files in ${MUSICS_DIR}...`);

const progress_bar = new ProgressBar("[:bar] :current/:total", { total: video_data.length, complete: "#", incomplete: "-", width: process.stdout.getWindowSize()[0] - 16 });
const create_mp3 = (data: VideoData) => exec(`yt-dlp '${video_id_to_url(data.id)}' -x --audio-format mp3 -o \"${music_filepath(data.title)}\"`);
if (parallel_mp3_creation) {
    const answer = await prompts({
        type: "confirm",
        name: "confirmation",
        message: "The next step may take up a lot of CPU for a few minutes. Do you wish to proceed?"
    });
    if (!answer.confirmation) process.exit(0);

    await Promise.all(video_data.map(async data => {
        try {
            await fs.access(music_filepath(data.title));
            progress_bar.tick();
        } catch (err) {
            await create_mp3(data);
            progress_bar.tick();
        }
    }));
} else {
    for (let data of video_data) {
        try {
            await fs.access(music_filepath(data.title));
        } catch (err) {
            await create_mp3(data);
        }
        progress_bar.tick();
    }
}
