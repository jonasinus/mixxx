const audioCtx = new AudioContext()

class Deck {
    /** @param {number} id */
    constructor(id) {
        this.id = id
        this.lpf = audioCtx.createBiquadFilter()
        this.mpf = audioCtx.createBiquadFilter()
        this.hpf = audioCtx.createBiquadFilter()
        this.gainNode = audioCtx.createGain()

        this.lpf.type = 'lowshelf'
        this.mpf.type = 'peaking'
        this.hpf.type = 'highshelf'

        this.lpf.gain.value = 0
        this.mpf.gain.value = 0
        this.hpf.gain.value = 0

        this.lpf.connect(this.mpf)
        this.mpf.connect(this.hpf)
        this.hpf.connect(this.gainNode)
        this.gainNode.connect(audioCtx.destination)

        this.source = null
        this.pitchShifter = null

        this.playing = false
        this.loaded = false
        this.analyzed = false
        this.musicTempo = null
    }

    /** @param {Track} track  */
    async load(track) {
        this.track = track
        await this.track.load()

        this.source = audioCtx.createBufferSource()
        this.source.buffer = this.track.buffer

        this.pitchShifter = new window.SoundTouch.PitchShifter(audioCtx, this.source.buffer, 4096, () => {
            console.info(`deck [${this.id}] track has ended!`)
            if (this.loopEnabled) {
                this.pitchShifter.seekToMs(0)
            }
        })
        this.loaded = true
        console.info(`track "${this.track.props.title}" loaded to deck [${this.id}]`)
        console.info(`analyzing track "${this.track.props.title}" of deck [${this.id}]...`)
        this.musicTempo = new MusicTempo(this.pitchShifter.audioBuffer.getChannelData(0))
        this.analyzed = true
        console.info(`analyzing complete!`)
    }

    play() {
        if (!this.playing && this.pitchShifter && this.lpf && this.loaded) {
            this.pitchShifter.connect(this.lpf)
            this.playing = true
            console.info(`deck [${this.id}] playback started`)
        }
    }

    pause() {
        if (this.playing && this.pitchShifter) {
            this.pitchShifter.disconnect()
            this.playing = false
            console.info(`deck [${this.id}] playback stopped`)
        }
    }

    seekToMs(milliseconds) {
        if (this.pitchShifter) {
            this.pitchShifter.seekToMs(milliseconds)
            console.info(`deck [${this.id}] seeked successfully`)
        }
    }

    eject() {
        this.pause()
        this.track = null
        this.source = null
        this.pitchShifter = null
        this.loaded = false
        console.info(`deck [${this.id}] track ejected`)
    }

    set rate(rate) {
        if (this.pitchShifter) {
            this.pitchShifter.rate(rate)
        }
    }

    set tempo(tempo) {
        if (this.pitchShifter) {
            this.pitchShifter.tempo(tempo)
        }
    }

    set pitch(value) {
        if (this.pitchShifter) {
            this.pitchShifter.pitch(value)
        }
    }

    set lpfGain(value) {
        if (this.lpf) {
            this.lpf.gain.value = value
        }
    }
    set mpfGain(value) {
        if (this.mpf) {
            this.mpf.gain.value = value
        }
    }
    set hpfGain(value) {
        if (this.hpf) {
            this.hpf.gain.value = value
        }
    }
    set volune(value) {
        if (this.gainNode) {
            this.gainNode.gain.value = value
        }
    }

    set loopStart(startMs) {
        this.loopProps.startMs = startMs
    }

    set loopEndMs(endMs) {
        this.loopProps.endMs = endMs
    }

    set loopTimes(times) {
        this.loopProps.times = times
    }

    set loopEnabled(enabled) {
        this.loopEnabled = enabled
    }

    get loopProps() {
        return this.loopProps
    }

    get trackDuration() {
        if (this.pitchShifter) {
            return this.pitchShifter.duration
        }
        return null
    }

    get trackPosition() {
        if (this.pitchShifter) {
            return this.pitchShifter.timePlayed
        }
        return null
    }

    get trackData() {
        return {
            musicTempo: this.musicTempo,
            loopEnabled: this.loopEnabled,

            trackProps: this.track.props,
            duration: this.trackDuration,
            position: this.trackPosition,
            lpf: this.lpf,
            mpf: this.mpf,
            hpf: this.hpf,
            volume: this.volune,
            rate: this.rate,
            tempo: this.tempo,
            pitch: this.pitch
        }
    }
}

class Track {
    props
    buffer
    loaded = false

    /** @param {TrackProps} trackProps */
    constructor(trackProps) {
        this.props = trackProps
    }

    async load() {
        if (!this.loaded) {
            let resp = await fetch(this.props.url)
            let buffer = await resp.arrayBuffer()
            this.buffer = await audioCtx.decodeAudioData(buffer)
            this.loaded = true
            console.info(`track ${this.props.title} prepared`)
        }
    }

    get props() {
        return this.props
    }
}

class TrackProps {
    title = ''
    artists = []
    album = ''
    url = ''

    constructor(title, artists, album, url) {
        this.title = title
        this.artists = artists
        this.album = album
        this.url = url
    }

    get album() {
        return this.album
    }

    get artists() {
        return this.artists
    }

    get title() {
        return this.title
    }
}

const d = new Deck(1)
const t = new Track(new TrackProps('b', [], 'unknown', './b.mp3'))
