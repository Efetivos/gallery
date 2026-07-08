import * as THREE from 'three'
import { Line2 } from 'three/examples/jsm/lines/Line2.js'
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry.js'
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js'

export default class PathModule {
    constructor({ group, curveData, options = {} }) {
        this.group = group
        this.curveData = curveData
        this.meshesGroup = new THREE.Group()
        this.meshesGroup.name = 'PathMeshesGroup'
        this.group.add(this.meshesGroup)

        this.options = {
            lineColor: '#FFFFFF',
            lineOpacity: 1,
            pathThickness: 1,
            pathWorldUnits: false,
            renderComets: true,
            cometColor: '#C8F1FF',
            cometGlowColor: '#7CCBFF',
            cometGlowOpacity: 0.35,
            cometTrailOpacity: 0.45,
            cometTrailLength: 20,
            cometTrailJumpThreshold: 0.8,
            sampleMultiplier: 8,
            thicknessComet: 1,
            minSamples: 160,
            maxSamples: 1600,
            is_closed: false,
            ...options,
        }

        this.pathEntries = []
        this.cometEntries = []
        this.debugItems = []
        this.resolution = new THREE.Vector2(1, 1)

        this.updateLineResolution()
    }

    updateLineResolution(width = window.innerWidth, height = window.innerHeight) {
        this.resolution.set(Math.max(1, width), Math.max(1, height))

        for (const entry of this.pathEntries) {
            entry.lineMaterial.resolution.copy(this.resolution)
        }
    }

    isVector(value) {
        return Array.isArray(value) && value.length >= 3 &&
            value.every((entry) => typeof entry === 'number')
    }

    getPathSegments(rawData) {
        const segments = []

        const walk = (node) => {
            if (!Array.isArray(node) || node.length === 0) return

            if (this.isVector(node[0])) {
                const points = node
                    .filter((entry) => this.isVector(entry))
                    .map((entry) => new THREE.Vector3(entry[0], entry[1], entry[2]))

                if (points.length >= 2) segments.push(points)
                return
            }

            for (const child of node) {
                walk(child)
            }
        }

        walk(rawData)
        return segments
    }

    getOpenPoints(points) {
        if (!points || points.length < 2) return points

        const first = points[0]
        const last = points[points.length - 1]

        if (first.distanceToSquared(last) < 1e-6) {
            return points.slice(0, -1)
        }

        return points
    }

    build() {
        const hasPath = this.createPath()
        if (!hasPath) return false

        this.createComets()
        this.resetCometTrail()
        this.applyDrawProgress(0)

        return true
    }

    createPath() {
        const segments = this.getPathSegments(this.curveData)

        if (!segments.length) {
            console.warn('PathModule: curve json does not contain enough valid points.')
            return false
        }

        const baseMaterial = new LineMaterial({
            color: this.options.lineColor,
            transparent: true,
            opacity: this.options.lineOpacity,
            linewidth: this.options.pathThickness,
            worldUnits: this.options.pathWorldUnits,
        })
        baseMaterial.resolution.copy(this.resolution)

        for (let i = 0; i < segments.length; i++) {
            const points = this.getOpenPoints(segments[i])
            const curve = new THREE.CatmullRomCurve3(points, this.options.is_closed, 'centripetal', 0.5)
            const sampleCount = THREE.MathUtils.clamp(
                points.length * this.options.sampleMultiplier,
                this.options.minSamples,
                this.options.maxSamples
            )
            const samples = curve.getPoints(sampleCount)

            const positions = new Float32Array(samples.length * 3)
            for (let j = 0; j < samples.length; j++) {
                const point = samples[j]
                const idx = j * 3
                positions[idx] = point.x
                positions[idx + 1] = point.y
                positions[idx + 2] = point.z
            }

            const lineGeometry = new LineGeometry()
            lineGeometry.setPositions(positions)
            lineGeometry.instanceCount = 0
            lineGeometry.maxInstancedCount = 0

            const lineMaterial = baseMaterial.clone()
            lineMaterial.resolution.copy(this.resolution)

            const line = new Line2(lineGeometry, lineMaterial)
            line.computeLineDistances()
            this.meshesGroup.add(line)

            this.pathEntries.push({ curve, samples, lineGeometry, lineMaterial, line })
            // this.debugItems.push({ name: `pathLine_${i + 1}`, item: line })
        }

        baseMaterial.dispose()
        return true
    }

    createComets() {
        if (!this.options.renderComets) return

        for (let i = 0; i < this.pathEntries.length; i++) {
            const comet = new THREE.Mesh(
                new THREE.SphereGeometry(0.02 * this.options.thicknessComet, 18, 18),
                new THREE.MeshBasicMaterial({ color: this.options.cometColor })
            )
            this.meshesGroup.add(comet)

            const cometGlow = new THREE.Mesh(
                new THREE.SphereGeometry(0.16, 14, 14),
                new THREE.MeshBasicMaterial({
                    color: this.options.cometGlowColor,
                    transparent: true,
                    opacity: this.options.cometGlowOpacity,
                })
            )
            // this.meshesGroup.add(cometGlow)

            const trailPoints = []
            for (let j = 0; j < this.options.cometTrailLength; j++) {
                trailPoints.push(new THREE.Vector3())
            }

            const trailGeometry = new THREE.BufferGeometry().setFromPoints(trailPoints)
            const trailMaterial = new THREE.LineBasicMaterial({
                color: this.options.cometGlowColor,
                transparent: true,
                opacity: this.options.cometTrailOpacity,
            })
            const trail = new THREE.Line(trailGeometry, trailMaterial)
            this.meshesGroup.add(trail)

            const entry = {
                curve: this.pathEntries[i].curve,
                comet,
                cometGlow,
                trailPoints,
                trailGeometry,
                trailMaterial,
                trail,
            }

            this.cometEntries.push(entry)
            // this.debugItems.push({ name: `comet_${i + 1}`, item: comet })
        }

        this.setCometsVisible(false)
    }

    setCometsVisible(visible) {
        for (const entry of this.cometEntries) {
            entry.comet.visible = visible
            entry.cometGlow.visible = visible
            entry.trail.visible = visible
        }
    }

    resetCometTrail() {
        for (const entry of this.cometEntries) {
            const origin = entry.curve.getPointAt(0)

            for (let i = 0; i < entry.trailPoints.length; i++) {
                entry.trailPoints[i].copy(origin)
            }

            entry.trailGeometry.setFromPoints(entry.trailPoints)
            entry.comet.position.copy(origin)
            entry.cometGlow.position.copy(origin)
        }
    }

    updateCometTrail(entry, position) {
        const head = entry.trailPoints[0]

        // Scrubbing or jumping timeline progress can move the tip far in one frame.
        // In that case, reset the trail to avoid a long straight connector artifact.
        if (head.distanceTo(position) > this.options.cometTrailJumpThreshold) {
            for (let i = 0; i < entry.trailPoints.length; i++) {
                entry.trailPoints[i].copy(position)
            }

            entry.trailGeometry.setFromPoints(entry.trailPoints)
            return
        }

        for (let i = entry.trailPoints.length - 1; i > 0; i--) {
            entry.trailPoints[i].copy(entry.trailPoints[i - 1])
        }

        entry.trailPoints[0].copy(position)
        entry.trailGeometry.setFromPoints(entry.trailPoints)
    }

    applyDrawProgress(progress) {
        const clampedProgress = THREE.MathUtils.clamp(progress, 0, 1)
        const shouldShowComets = this.options.renderComets && clampedProgress > 0

        this.setCometsVisible(shouldShowComets)

        for (const entry of this.pathEntries) {
            const local = Math.floor(clampedProgress * entry.samples.length)
            const drawCount = local <= 0 ? 0 : Math.max(2, Math.min(local, entry.samples.length))

            if (drawCount < 2) {
                entry.line.visible = false
                entry.lineGeometry.instanceCount = 0
                entry.lineGeometry.maxInstancedCount = 0
                continue
            }

            entry.line.visible = true
            const visibleSegments = drawCount - 1
            entry.lineGeometry.instanceCount = visibleSegments
            entry.lineGeometry.maxInstancedCount = visibleSegments
        }

        if (!shouldShowComets) return

        for (const entry of this.cometEntries) {
            const tipPosition = entry.curve.getPointAt(clampedProgress)
            entry.comet.position.copy(tipPosition)
            entry.cometGlow.position.copy(tipPosition)
            this.updateCometTrail(entry, tipPosition)
        }
    }

    update(elapsed) {
        this.updateLineResolution()

        if (!this.options.renderComets) return

        const pulse = 0.15 + Math.sin(elapsed * 0.0032) * 0.03

        for (const entry of this.cometEntries) {
            entry.cometGlow.scale.setScalar(1 + pulse)
        }
    }

    getPathData() {
        return {
            segmentCount: this.pathEntries.length,
            totalSampleCount: this.pathEntries.reduce((sum, entry) => sum + entry.samples.length, 0),
            thickness: this.options.pathThickness,
            renderComets: this.options.renderComets,
            segments: this.pathEntries.map((entry, index) => ({
                index,
                sampleCount: entry.samples.length,
                start: entry.curve.getPointAt(0).toArray(),
                end: entry.curve.getPointAt(1).toArray(),
            })),
        }
    }

    setRenderComets(shouldRender) {
        this.options.renderComets = Boolean(shouldRender)
        this.setCometsVisible(false)
    }

    getRenderComets() {
        return this.options.renderComets
    }

    setPathThickness(thickness) {
        const value = Math.max(0.1, Number(thickness) || 1)
        this.options.pathThickness = value

        for (const entry of this.pathEntries) {
            entry.lineMaterial.linewidth = value
            entry.lineMaterial.needsUpdate = true
        }
    }

    getPathThickness() {
        return this.options.pathThickness
    }

    getDebugItems() {
        return this.debugItems
    }

    getMeshesGroup() {
        return this.meshesGroup
    }

    dispose() {
        for (const entry of this.pathEntries) {
            this.meshesGroup.remove(entry.line)
            entry.lineGeometry.dispose()
            entry.lineMaterial.dispose()
        }

        for (const entry of this.cometEntries) {
            this.meshesGroup.remove(entry.comet)
            this.meshesGroup.remove(entry.cometGlow)
            this.meshesGroup.remove(entry.trail)

            entry.trailGeometry.dispose()
            entry.trailMaterial.dispose()
            entry.comet.geometry.dispose()
            entry.comet.material.dispose()
            entry.cometGlow.geometry.dispose()
            entry.cometGlow.material.dispose()
        }

        this.pathEntries = []
        this.cometEntries = []
        this.debugItems = []

        this.group.remove(this.meshesGroup)
    }
}
