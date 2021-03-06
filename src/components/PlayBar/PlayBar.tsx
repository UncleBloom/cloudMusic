import * as React from "react";
import { useEffect, useState } from "react";
import ISongInfo, { EmptySongInfo } from "../../api/types/songInfo";
import { Popover, Slider } from "antd";
import { StepBackwardOutlined, StepForwardOutlined } from "@ant-design/icons";
import "./PlayBar.scss";
import PlayPattern from "../../api/types/playPattern";
import axios from "axios";
import serverHost from "../../api/serverHost";
import PlayListDisplay from "../PlaylistDisplay/PlayListDisplay";
// import { EmptyList } from "../../api/types/playList";
import useInterval from "../../hooks/useInterval";

interface ISongUrlResponse {
  code: number;
  data: {
    id: number;
    url: string;
  }[];
}

interface IPlayBarParams {
  songList: ISongInfo[];
  playingIndex: number;
  songInfo: ISongInfo; // 歌曲信息
  playPause: boolean; // 播放/暂停
  pattern: PlayPattern; // 播放模式
  setPlay: () => void;
  setPause: () => void;
  changePattern: () => void; // 改变播放模式的回调函数
  fetchCurrentTime: (value: number) => void; // 获得当前播放时间的回调函数
  playNextSong: () => boolean; // 播放下一首歌曲
  playPreviousSong: () => boolean; // 播放上一首歌曲
  changePlaying: (index: number) => void;
  deleteSong: (index: number) => void; // 删除歌曲
}

export const audioRef = React.createRef<HTMLAudioElement>();

export function PlayBar(params: IPlayBarParams) {
  const info: ISongInfo = params.songInfo;
  const [isFolded, setIsFolded] = React.useState(true);
  const [volume, setVolume] = useState<number>(70);
  const [mute, setMute] = useState<boolean>(false);
  const [drag, setDrag] = useState<boolean>(false);
  const [playlistVisible, setPlaylistVisible] = useState<boolean>(false);
  const [progressDotX, setProgressDotX] = useState<number>(0);
  const [songUrl, setSongUrl] = useState<string>("");
  const [currentTime, setCurrentTime] = useState<number>(0);
  const audioNode = audioRef.current;

  /**
   * 每 200ms 更新一次播放进度
   */
  useInterval(() => {
    if (audioNode?.currentTime) {
      setCurrentTime(audioNode?.currentTime);
    }
  }, 200);

  /**
   * 修改音量
   */
  useEffect(() => {
    if (audioNode) {
      audioNode.volume = mute ? 0 : volume / 100;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [volume, mute]);

  /**
   * 修改播放暂停
   */
  useEffect(() => {
    if (audioNode) {
      params.playPause ? audioNode.play() : audioNode.pause();
    }
  }, [audioNode, params.playPause]);

  /**
   * 改变进度条长度,并更新父组件的 currentTime
   */
  useEffect(() => {
    if (info && !drag) {
      setProgressDotX((currentTime / (info.dt / 1000)) * window.innerWidth);
    }
    params.fetchCurrentTime(currentTime);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [info, currentTime]);

  /**
   * 当前播放歌曲改变时 获取歌曲播放 URL 并设置
   */
  useEffect(() => {
    const getSongUrl = async (songId: number): Promise<ISongUrlResponse> => {
      const data = await axios.get(serverHost + "/song/url", {
        params: {
          id: songId,
        },
      });
      return data.data;
    };
    getSongUrl(info.id).then((Response) => {
      setSongUrl(Response.data[0].url);
    });
  }, [info]);

  /**
   * 鼠标点击进度条时改变当前播放时间
   * @param event 鼠标点击事件
   */
  const handleClickLine: React.MouseEventHandler<HTMLDivElement> = (
    event: React.MouseEvent
  ) => {
    setProgressDotX(event.clientX);
    (audioNode as HTMLAudioElement).currentTime =
      ((event.clientX / window.innerWidth) * info.dt) / 1000;
  };
  const handleMouseDown: React.MouseEventHandler<HTMLDivElement> = () => {
    setDrag(true);
  };
  const handleMouseMove: React.MouseEventHandler<HTMLDivElement> = (
    event: React.MouseEvent
  ) => {
    if (drag) {
      setProgressDotX(event.clientX);
    }
  };
  const handleMouseUp: React.MouseEventHandler<HTMLDivElement> = (
    event: React.MouseEvent
  ) => {
    if (drag) {
      (audioNode as HTMLAudioElement).currentTime =
        ((event.clientX / window.innerWidth) * info.dt) / 1000;
    }
    setDrag(false);
  };

  /**
   * 处理设置静音
   */
  const handleSetMute: React.MouseEventHandler<HTMLSpanElement> = () => {
    setMute(!mute);
    if (volume === 0) {
      setVolume(1);
    }
  };
  /**
   * 处理设置音量
   * @param value 音量值
   */
  const handleSetVolume = (value: number) => {
    if (value === 0) {
      setMute(true);
    } else {
      setMute(false);
      setVolume(value);
    }
  };

  const playedLineCss: React.CSSProperties = {
    width: progressDotX,
  };
  const progressDotCss: React.CSSProperties = {
    left: progressDotX,
  };

  return (
    <div
      className="playBar"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      <PlayListDisplay
        songList={params.songList}
        playingIndex={params.playingIndex}
        visible={playlistVisible}
        onClose={() => setPlaylistVisible(false)}
        changePlaying={params.changePlaying}
        deleteSong={params.deleteSong}
      />
      <audio
        ref={audioRef}
        src={songUrl}
        autoPlay
        onEnded={() => params.playNextSong()}
        onPlay={params.setPlay}
        onPause={params.setPause}
      />
      <div className="progressBar">
        <div className="progressBarLine" onClick={handleClickLine}>
          <div className="progressBarPlayedLine" style={playedLineCss} />
          <div
            className="progressBarDot"
            onMouseDown={handleMouseDown}
            style={progressDotCss}
          />
        </div>
      </div>
      <div className="playBarContent">
        <div
          className="infoDisplayPlayBar"
          style={{ visibility: info === EmptySongInfo ? "hidden" : "visible" }}
        >
          {info === EmptySongInfo ? (
            <img alt="" className="emptyImg" />
          ) : (
            <img
              src={info.al.picUrl}
              alt=""
              onClick={() => {
                window.scrollTo({
                  top: 0,
                  left: 0,
                  behavior: "smooth",
                });
                if (isFolded) {
                  window.location.hash = "/play";
                  document
                    .querySelector(".playPage")
                    ?.setAttribute("class", "playPage");
                } else {
                  window.history.back();
                  document
                    .querySelector(".playPage")
                    ?.setAttribute("class", "playPage hide");
                }
                setIsFolded(!isFolded);
              }}
            />
          )}
          <div>
            <div className="nameAndArtist">
              <span className="name">{info.name}</span>
              <span className="artistName">{`  - ${info.ar[0].name}`}</span>
            </div>
            <div className="duration">{`${formatCurrentTime(
              currentTime
            )} / ${formatDuration(info.dt)}`}</div>
          </div>
        </div>
        <span className="playController">
          <StepBackwardOutlined
            style={{ fontSize: 30, color: "#d53a31" }}
            onClick={() => params.playPreviousSong()}
          />
          <span
            className="playPauseButton"
            onClick={params.playPause ? params.setPause : params.setPlay}
          >
            {params.playPause ? (
              <span
                className="iconfont"
                style={{ fontSize: 40, color: "#d53a31" }}
              >
                &#xe61b;
              </span>
            ) : (
              <span
                className="iconfont"
                style={{ fontSize: 40, color: "#d53a31" }}
              >
                &#xea82;
              </span>
            )}
          </span>
          <StepForwardOutlined
            style={{ fontSize: 30, color: "#d53a31" }}
            onClick={() => params.playNextSong()}
          />
        </span>
        <span className="listController">
          <span
            className="patternButton iconfont controlIcon"
            onClick={params.changePattern}
          >
            {(() => {
              switch (params.pattern) {
                case PlayPattern.Random:
                  return <>&#xea75;</>;
                case PlayPattern.Loop:
                  return <>&#xea76;</>;
                case PlayPattern.Single:
                  return <>&#xea77;</>;
              }
            })()}
          </span>
          <span
            className="iconfont controlIcon"
            onClick={
              playlistVisible
                ? () => setPlaylistVisible(false)
                : () => setPlaylistVisible(true)
            }
            style={
              playlistVisible
                ? { color: "#d53a31", fontWeight: "100" }
                : { fontWeight: "100" }
            }
          >
            &#xea6f;
          </span>
          <Popover
            content={
              <Slider
                style={{
                  display: "inline-block",
                  height: 100,
                }}
                className="volumeSlider"
                min={0}
                max={100}
                vertical={true}
                value={mute ? 0 : volume}
                onChange={handleSetVolume}
              />
            }
            placement="top"
            trigger="hover"
          >
            <span className="iconfont controlIcon" onClick={handleSetMute}>
              {volume === 0 || mute ? (
                <>&#xea0b;</>
              ) : volume <= 33 ? (
                <>&#xea0d;</>
              ) : volume <= 67 ? (
                <>&#xea0e;</>
              ) : (
                <>&#xea0c;</>
              )}
            </span>
          </Popover>
        </span>
      </div>
    </div>
  );
}

export default PlayBar;

// 格式化时间输出
const formatDuration = (time: number) => {
  const minute = Math.floor(time / 60000),
    second = Math.floor(time / 1000) % 60;
  return `${(minute < 10 ? "0" : "") + minute.toString()}:${
    (second < 10 ? "0" : "") + second.toString()
  }`;
};
const formatCurrentTime = (time: number) => {
  const minute = Math.floor(time / 60),
    second = Math.floor(time % 60);
  return `${(minute < 10 ? "0" : "") + minute.toString()}:${
    (second < 10 ? "0" : "") + second.toString()
  }`;
};
