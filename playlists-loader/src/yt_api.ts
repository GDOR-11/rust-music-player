import axios from "axios";
import * as duration from "duration-fns";

type VideoData = {
    id: string,
    title: string,
    channel: string,
    publication_date: Date,
    thumbnail: string
    duration: number,
    statistics: {
        views: number,
        likes: number,
        comments: number
    }
};

const API_KEY = process.env["YOUTUBE_API_KEY"];
if (!API_KEY) throw "no api key found in YOUTUBE_API_KEY environment variable!";

function api_response_to_video_data(api_response: any): VideoData {
    const err = (property: string) => { throw `API response did not include ${property}` };
    return {
        id: api_response?.id ?? err("video id"),
        title: api_response?.snippet?.title ?? err("video title"),
        channel: api_response?.snippet?.channelTitle ?? err("channel title"),
        publication_date: new Date(api_response?.snippet?.publishedAt ?? err("video publication date")),
        thumbnail: api_response?.snippet?.thumbnails?.high?.url ?? err("high video thumbnail url"),
        duration: duration.toSeconds(api_response?.contentDetails?.duration ?? err("video duration")),
        statistics: {
            views: Number(api_response?.statistics?.viewCount ?? err("amout of views")),
            likes: Number(api_response.statistics.likeCount ?? err("amount of likes")),
            comments: Number(api_response.statistics.commentCount ?? err("amount of comments"))
        }
    } as VideoData;
}

export async function get_video_data(video_id: string): Promise<VideoData> {
    const response = await axios.get("https://www.googleapis.com/youtube/v3/videos", {
        params: {
            part: "contentDetails,id,snippet,statistics",
            id: video_id,
            key: API_KEY
        }
    });
    return api_response_to_video_data(response.data.items[0]);
}

export async function get_playlist_videos_data(playlist_id: string): Promise<VideoData[]> {
    let videos: any[] = [];

    let nextPageToken: string | undefined;
    do {
        const playlist_response = await axios.get("https://www.googleapis.com/youtube/v3/playlistItems", {
            params: {
                part: "contentDetails",
                maxResults: 50,
                playlistId: playlist_id,
                key: API_KEY,
                pageToken: nextPageToken
            }
        });
        nextPageToken = playlist_response.data.nextPageToken;
        const videos_response = await axios.get("https://www.googleapis.com/youtube/v3/videos", {
            params: {
                part: "contentDetails,id,snippet,statistics",
                id: playlist_response.data.items.map((item: any) => item.contentDetails.videoId).join(","),
                key: API_KEY
            }
        });
        videos = videos.concat(videos_response.data.items);
    } while (nextPageToken !== undefined);

    return videos.map(api_response_to_video_data);
}


export function video_id_to_url(id: string): string {
    return "https://www.youtube.com/watch?v=" + id;
}
