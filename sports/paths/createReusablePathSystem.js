import * as THREE from 'three'
import PathModule from './modules/PathModule'
import TimelineModule from './modules/TimelineModule'

export function createReusablePathSystem(sceneOrGroup, curveData, options = {}) {
    const isGroup = sceneOrGroup instanceof THREE.Group
    const group = isGroup ? sceneOrGroup : new THREE.Group()

    if (!isGroup && sceneOrGroup) {
        sceneOrGroup.add(group)
    }

    const drawState = { progress: options.timeline?.from ?? 0 }

    const pathModule = new PathModule({
        group,
        curveData,
        options: options.path || {},
    })

    const hasPath = pathModule.build()
    const meshesGroup = pathModule.getMeshesGroup()

    if (!hasPath) {
        return {
            group,
            meshesGroup,
            drawState,
            pathModule,
            timelineModule: null,
            update: () => {},
            play: () => {},
            pause: () => {},
            restart: () => {},
            setProgress: () => {},
            renderComets: (shouldRender) => pathModule.setRenderComets(shouldRender),
            getRenderComets: () => pathModule.getRenderComets(),
            setPathThickness: (thickness) => pathModule.setPathThickness(thickness),
            getPathThickness: () => pathModule.getPathThickness(),
            getPathData: () => null,
            getTimelineData: () => null,
            getDebugItems: () => [],
            dispose: () => {
                pathModule.dispose()
                if (!isGroup && group.parent) group.parent.remove(group)
            },
        }
    }

    const timelineModule = new TimelineModule({
        target: drawState,
        key: options.timeline?.key || 'progress',
        options: options.timeline || {},
        onUpdate: () => {
            pathModule.applyDrawProgress(drawState.progress)
            options.onUpdate?.(drawState.progress)
        },
        onStartCycle: () => {
            pathModule.resetCometTrail()
            options.onStartCycle?.()
        },
        onResetCycle: () => {
            pathModule.applyDrawProgress(drawState.progress)
            pathModule.resetCometTrail()
            options.onResetCycle?.()
        },
    })

    timelineModule.build()

    return {
        group,
        meshesGroup,
        drawState,
        pathModule,
        timelineModule,
        update: (elapsed) => {
            pathModule.update(elapsed)
        },
        play: () => timelineModule.play(),
        pause: () => timelineModule.pause(),
        restart: () => timelineModule.restart(),
        setProgress: (progress) => timelineModule.setProgress(progress),
        renderComets: (shouldRender) => pathModule.setRenderComets(shouldRender),
        getRenderComets: () => pathModule.getRenderComets(),
        setPathThickness: (thickness) => pathModule.setPathThickness(thickness),
        getPathThickness: () => pathModule.getPathThickness(),
        getPathData: () => pathModule.getPathData(),
        getTimelineData: () => timelineModule.getTimelineData(),
        getDebugItems: () => pathModule.getDebugItems(),
        dispose: () => {
            timelineModule.dispose()
            pathModule.dispose()

            if (!isGroup && group.parent) {
                group.parent.remove(group)
            }
        },
    }
}
