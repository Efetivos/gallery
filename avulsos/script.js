const time = 1.8


new SplitType('.ctn-title__title', { types: 'words, chars' })

const tl_intro = gsap.timeline()
    .from('.intro__img__hold', { duration: time, clipPath: 'inset(50%)', ease: 'expo.out', stagger: 0.2 })
    .fromTo('.intro__hold', {  yPercent: 0 }, {  duration: time * 1.2, yPercent: -50, ease: 'expo.inOut' })
    .fromTo('.intro__fader', {  opacity: 0 }, {  duration: time * 1.2, opacity: 1, ease: 'expo.inOut' },'<')
    .fromTo('.bg-media', {  yPercent: 100 }, {  duration: time * 1.2, yPercent: 0, ease: 'expo.inOut' },'<')
    .fromTo('.bg-media video', {   yPercent: - 50 }, {  duration: time * 1.2, yPercent: 0, ease: 'expo.inOut'  },'<')



const tl_header = gsap.timeline({ defaults: { ease: 'expo.out' } })
    .from('.word', { duration: time * 1.3, yPercent: 105, stagger: .1 })
    .from('.ctn-title__cta', { duration: time * 1.2, scale: 0, y: (window.innerHeight * 0.1), stagger: .08 }, '<25%')
    .from('.header__holder > *', { duration: time * 1.2, opacity: 0, y: - (window.innerHeight * 0.03), stagger: .08 }, '<15%')
    .from('.copyrights, .descr', { duration: time * 1.2, opacity: 0, y: (window.innerHeight * 0.03), stagger: .08 }, '<')
    .from('.bg-media video', { duration: time, scale: 2, ease: 'expo.inOut' }, 0)


const tl_master = gsap.timeline({ onComplete:() => { console.log('the animation is done') })
.add(tl_intro)
.add(tl_header, '-=.8')

