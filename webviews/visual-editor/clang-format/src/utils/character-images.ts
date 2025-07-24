/**
 * 动漫角色图片索引
 * 包含所有85张WebP图片的路径信息
 */

// MyGO 角色图片 (20张)
const mygoImages = [
    'angry.webp',
    'block.webp',
    'creating.webp',
    'crying-loudly.webp',
    'huh.webp',
    'interesting-woman.webp',
    'just-woke-up.webp',
    'let-me-see.webp',
    'love.webp',
    'matcha-parfait.webp',
    'melancholy.webp',
    'no-fighting.webp',
    'no-way.webp',
    'peeking.webp',
    'please-order.webp',
    'running-away.webp',
    'sending-message.webp',
    'shy.webp',
    'what-about-me.webp',
    'why.webp'
].map(name => `MyGO/${name}`);

// Ave-Mujica 角色图片 (20张)
const aveMujicaImages = [
    'angry.webp',
    'buy-all-at-once.webp',
    'could-it-be.webp',
    'delicious.webp',
    'eh.webp',
    'happy.webp',
    'hmph.webp',
    'no-way.webp',
    'pleasant.webp',
    'pretty-good.webp',
    'remember-to-smile.webp',
    'scared.webp',
    'scissors.webp',
    'shocked.webp',
    'sleeping.webp',
    'suddenly.webp',
    'sulking.webp',
    'wait-a-moment.webp',
    'what-about-me.webp',
    'will-report-you.webp'
].map(name => `Ave-Mujica/${name}`);

// Girls Band Cry 角色图片 (45张)
const girlsBandCryImages = [
    'ah.webp',
    'angry.webp',
    'appear.webp',
    'being-pulled.webp',
    'box-head.webp',
    'bye-bye.webp',
    'catching-box.webp',
    'confident.webp',
    'crying.webp',
    'deep-sleep.webp',
    'depressed.webp',
    'driving-rupa.webp',
    'driving.webp',
    'eating.webp',
    'eww.webp',
    'gritting-teeth.webp',
    'heart-gesture.webp',
    'huh.webp',
    'joy.webp',
    'laughing.webp',
    'love.webp',
    'mischievous-smile.webp',
    'mocking-subaru.webp',
    'mocking.webp',
    'no-way.webp',
    'offering-flowers.webp',
    'peeking.webp',
    'pinching-cheek.webp',
    'please.webp',
    'pointing.webp',
    'pulling-person.webp',
    'rock-and-roll.webp',
    'scratching-head.webp',
    'showing-teeth.webp',
    'shy.webp',
    'sigh.webp',
    'silent.webp',
    'stubborn.webp',
    'stunned.webp',
    'surprised.webp',
    'sweating.webp',
    'teary-eyes.webp',
    'tongue-out.webp',
    'what-are-you-doing.webp',
    'wiggling.webp'
].map(name => `Girls-Band-Cry/${name}`);

// 合并所有图片路径
export const ALL_CHARACTER_IMAGES = [
    ...mygoImages,
    ...aveMujicaImages,
    ...girlsBandCryImages
];

/**
 * 随机选择一张角色图片
 * @returns 图片的相对路径
 */
export function getRandomCharacterImage(): string {
    const randomIndex = Math.floor(Math.random() * ALL_CHARACTER_IMAGES.length);
    return ALL_CHARACTER_IMAGES[randomIndex];
}

/**
 * 获取图片的完整路径（用于在占位符HTML中使用）
 * @param imagePath 相对路径
 * @returns 完整的图片路径
 */
export function getImagePath(imagePath: string): string {
    return `./assets/images/${imagePath}`;
}

/**
 * 获取所有图片的统计信息
 */
export function getImageStats() {
    return {
        total: ALL_CHARACTER_IMAGES.length,
        mygo: mygoImages.length,
        aveMujica: aveMujicaImages.length,
        girlsBandCry: girlsBandCryImages.length
    };
}