import gsap from 'gsap'

export default class TimelineModule {
    constructor({ target, key = 'progress', options = {}, onUpdate, onStartCycle, onResetCycle }) {
        this.target = target
        this.key = key
        this.onUpdate = onUpdate
        this.onStartCycle = onStartCycle
        this.onResetCycle = onResetCycle

        this.options = {
            from: 0,
            to: 1,
            duration: 3,
            ease: 'none',
            repeat: -1,
            repeatDelay: 2,
            ...options,
        }

        this.timeline = null
    }

    build() {
        if (!this.target) return null

        this.timeline = gsap.timeline({
            repeat: this.options.repeat,
            repeatDelay: this.options.repeatDelay,
            defaults: {
                ease: this.options.ease,
                duration: this.options.duration,
            },
        })

        this.timeline.set(this.target, { [this.key]: this.options.from })
        this.onStartCycle?.()
        this.onUpdate?.()

        this.timeline.to(this.target, {
            [this.key]: this.options.to,
            onUpdate: () => {
                this.onUpdate?.()
            },
        })

        this.timeline.eventCallback('onRepeat', () => {
            this.target[this.key] = this.options.from
            this.onResetCycle?.()
            this.onStartCycle?.()
            this.onUpdate?.()
        })

        return this.timeline
    }

    play() {
        this.timeline?.play()
    }

    pause() {
        this.timeline?.pause()
    }

    setProgress(progress) {
        this.target[this.key] = progress
        this.onUpdate?.()
    }

    restart() {
        if (!this.timeline) return

        this.target[this.key] = this.options.from
        this.onResetCycle?.()
        this.onStartCycle?.()
        this.onUpdate?.()

        this.timeline.restart(true)
    }

    getTimelineData() {
        return {
            key: this.key,
            value: this.target?.[this.key],
            progress: this.timeline ? this.timeline.progress() : 0,
            duration: this.timeline ? this.timeline.duration() : this.options.duration,
            repeat: this.options.repeat,
            repeatDelay: this.options.repeatDelay,
            isActive: this.timeline ? this.timeline.isActive() : false,
        }
    }

    dispose() {
        this.timeline?.kill()
        this.timeline = null
    }
}
