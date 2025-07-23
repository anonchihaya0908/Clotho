import React, { useState, useEffect } from 'react';
import './style.css';

// Ave Mujica 图片导入
import aveBuyAllAtOnce from '../../assets/images/Ave Mujica/buy-all-at-once.webp';
import aveNoWay from '../../assets/images/Ave Mujica/no-way.webp';
import aveWaitAMoment from '../../assets/images/Ave Mujica/wait-a-moment.webp';
import aveHmph from '../../assets/images/Ave Mujica/hmph.webp';
import aveSulking from '../../assets/images/Ave Mujica/sulking.webp';
import aveScared from '../../assets/images/Ave Mujica/scared.webp';
import aveHappy from '../../assets/images/Ave Mujica/happy.webp';
import aveSudden from '../../assets/images/Ave Mujica/suddenly.webp';
import avePleasant from '../../assets/images/Ave Mujica/pleasant.webp';
import aveWhatAboutMe from '../../assets/images/Ave Mujica/what-about-me.webp';
import aveWillReportYou from '../../assets/images/Ave Mujica/will-report-you.webp';
import avePrettyGood from '../../assets/images/Ave Mujica/pretty-good.webp';
import aveScissors from '../../assets/images/Ave Mujica/scissors.webp';
import aveSleeping from '../../assets/images/Ave Mujica/sleeping.webp';
import aveDelicious from '../../assets/images/Ave Mujica/delicious.webp';
import aveRememberToSmile from '../../assets/images/Ave Mujica/remember-to-smile.webp';
import aveEh from '../../assets/images/Ave Mujica/eh.webp';
import aveAngry from '../../assets/images/Ave Mujica/angry.webp';
import aveCouldItBe from '../../assets/images/Ave Mujica/could-it-be.webp';
import aveShocked from '../../assets/images/Ave Mujica/shocked.webp';

// Girls Band Cry 图片导入
import gbcNoWay from '../../assets/images/Girls Band Cry/no-way.webp';
import gbcJoy from '../../assets/images/Girls Band Cry/joy.webp';
import gbcWhatAreYouDoing from '../../assets/images/Girls Band Cry/what-are-you-doing.webp';
import gbcStubborn from '../../assets/images/Girls Band Cry/stubborn.webp';
import gbcAppear from '../../assets/images/Girls Band Cry/appear.webp';
import gbcSigh from '../../assets/images/Girls Band Cry/sigh.webp';
import gbcTongueOut from '../../assets/images/Girls Band Cry/tongue-out.webp';
import gbcGrittingTeeth from '../../assets/images/Girls Band Cry/gritting-teeth.webp';
import gbcLaughing from '../../assets/images/Girls Band Cry/laughing.webp';
import gbcHuh from '../../assets/images/Girls Band Cry/huh.webp';
import gbcCrying from '../../assets/images/Girls Band Cry/crying.webp';
import gbcAh from '../../assets/images/Girls Band Cry/ah.webp';
import gbcLove from '../../assets/images/Girls Band Cry/love.webp';
import gbcMockingSubaru from '../../assets/images/Girls Band Cry/mocking-subaru.webp';
import gbcMocking from '../../assets/images/Girls Band Cry/mocking.webp';
import gbcEww from '../../assets/images/Girls Band Cry/eww.webp';
import gbcMischievousSmile from '../../assets/images/Girls Band Cry/mischievous-smile.webp';
import gbcShy from '../../assets/images/Girls Band Cry/shy.webp';
import gbcEating from '../../assets/images/Girls Band Cry/eating.webp';
import gbcDrivingRupa from '../../assets/images/Girls Band Cry/driving-rupa.webp';
import gbcDriving from '../../assets/images/Girls Band Cry/driving.webp';
import gbcSurprised from '../../assets/images/Girls Band Cry/surprised.webp';
import gbcStunned from '../../assets/images/Girls Band Cry/stunned.webp';
import gbcWiggling from '../../assets/images/Girls Band Cry/wiggling.webp';
import gbcPullingPerson from '../../assets/images/Girls Band Cry/pulling-person.webp';
import gbcPlease from '../../assets/images/Girls Band Cry/please.webp';
import gbcByeBye from '../../assets/images/Girls Band Cry/bye-bye.webp';
import gbcPointing from '../../assets/images/Girls Band Cry/pointing.webp';
import gbcPinchingCheek from '../../assets/images/Girls Band Cry/pinching-cheek.webp';
import gbcPeeking from '../../assets/images/Girls Band Cry/peeking.webp';
import gbcCatchingBox from '../../assets/images/Girls Band Cry/catching-box.webp';
import gbcRockAndRoll from '../../assets/images/Girls Band Cry/rock-and-roll.webp';
import gbcScratchingHead from '../../assets/images/Girls Band Cry/scratching-head.webp';
import gbcHeartGesture from '../../assets/images/Girls Band Cry/heart-gesture.webp';
import gbcSilent from '../../assets/images/Girls Band Cry/silent.webp';
import gbcTearyEyes from '../../assets/images/Girls Band Cry/teary-eyes.webp';
import gbcSweating from '../../assets/images/Girls Band Cry/sweating.webp';
import gbcOfferingFlowers from '../../assets/images/Girls Band Cry/offering-flowers.webp';
import gbcAngry from '../../assets/images/Girls Band Cry/angry.webp';
import gbcDeepSleep from '../../assets/images/Girls Band Cry/deep-sleep.webp';
import gbcBoxHead from '../../assets/images/Girls Band Cry/box-head.webp';
import gbcConfident from '../../assets/images/Girls Band Cry/confident.webp';
import gbcBeingPulled from '../../assets/images/Girls Band Cry/being-pulled.webp';
import gbcDepressed from '../../assets/images/Girls Band Cry/depressed.webp';
import gbcShowingTeeth from '../../assets/images/Girls Band Cry/showing-teeth.webp';

// MyGO 图片导入
import mygoBlock from '../../assets/images/MyGO/block.webp';
import mygoLove from '../../assets/images/MyGO/love.webp';
import mygoNoWay from '../../assets/images/MyGO/no-way.webp';
import mygoNoFighting from '../../assets/images/MyGO/no-fighting.webp';
import mygoWhy from '../../assets/images/MyGO/why.webp';
import mygoJustWokeUp from '../../assets/images/MyGO/just-woke-up.webp';
import mygoCreating from '../../assets/images/MyGO/creating.webp';
import mygoSendingMessage from '../../assets/images/MyGO/sending-message.webp';
import mygoHuh from '../../assets/images/MyGO/huh.webp';
import mygoCryingLoudly from '../../assets/images/MyGO/crying-loudly.webp';
import mygoShy from '../../assets/images/MyGO/shy.webp';
import mygoMelancholy from '../../assets/images/MyGO/melancholy.webp';
import mygoMatchaParfait from '../../assets/images/MyGO/matcha-parfait.webp';
import mygoPeeking from '../../assets/images/MyGO/peeking.webp';
import mygoInterestingWoman from '../../assets/images/MyGO/interesting-woman.webp';
import mygoRunningAway from '../../assets/images/MyGO/running-away.webp';
import mygoAngry from '../../assets/images/MyGO/angry.webp';
import mygoLetMeSee from '../../assets/images/MyGO/let-me-see.webp';
import mygoPleaseOrder from '../../assets/images/MyGO/please-order.webp';
import mygoWhatAboutMe from '../../assets/images/MyGO/what-about-me.webp';

interface PreviewPlaceholderProps {
    onReopenPreview: () => void;
    isReopening?: boolean;
}

// 定义图片分类和静态导入的映射
const imageCategories = {
    'Ave Mujica': [
        { name: 'buy-all-at-once', src: aveBuyAllAtOnce },
        { name: 'no-way', src: aveNoWay },
        { name: 'wait-a-moment', src: aveWaitAMoment },
        { name: 'hmph', src: aveHmph },
        { name: 'sulking', src: aveSulking },
        { name: 'scared', src: aveScared },
        { name: 'happy', src: aveHappy },
        { name: 'suddenly', src: aveSudden },
        { name: 'pleasant', src: avePleasant },
        { name: 'what-about-me', src: aveWhatAboutMe },
        { name: 'will-report-you', src: aveWillReportYou },
        { name: 'pretty-good', src: avePrettyGood },
        { name: 'scissors', src: aveScissors },
        { name: 'sleeping', src: aveSleeping },
        { name: 'delicious', src: aveDelicious },
        { name: 'remember-to-smile', src: aveRememberToSmile },
        { name: 'eh', src: aveEh },
        { name: 'angry', src: aveAngry },
        { name: 'could-it-be', src: aveCouldItBe },
        { name: 'shocked', src: aveShocked }
    ],
    'Girls Band Cry': [
        { name: 'no-way', src: gbcNoWay },
        { name: 'joy', src: gbcJoy },
        { name: 'what-are-you-doing', src: gbcWhatAreYouDoing },
        { name: 'stubborn', src: gbcStubborn },
        { name: 'appear', src: gbcAppear },
        { name: 'sigh', src: gbcSigh },
        { name: 'tongue-out', src: gbcTongueOut },
        { name: 'gritting-teeth', src: gbcGrittingTeeth },
        { name: 'laughing', src: gbcLaughing },
        { name: 'huh', src: gbcHuh },
        { name: 'crying', src: gbcCrying },
        { name: 'ah', src: gbcAh },
        { name: 'love', src: gbcLove },
        { name: 'mocking-subaru', src: gbcMockingSubaru },
        { name: 'mocking', src: gbcMocking },
        { name: 'eww', src: gbcEww },
        { name: 'mischievous-smile', src: gbcMischievousSmile },
        { name: 'shy', src: gbcShy },
        { name: 'eating', src: gbcEating },
        { name: 'driving-rupa', src: gbcDrivingRupa },
        { name: 'driving', src: gbcDriving },
        { name: 'surprised', src: gbcSurprised },
        { name: 'stunned', src: gbcStunned },
        { name: 'wiggling', src: gbcWiggling },
        { name: 'pulling-person', src: gbcPullingPerson },
        { name: 'please', src: gbcPlease },
        { name: 'bye-bye', src: gbcByeBye },
        { name: 'pointing', src: gbcPointing },
        { name: 'pinching-cheek', src: gbcPinchingCheek },
        { name: 'peeking', src: gbcPeeking },
        { name: 'catching-box', src: gbcCatchingBox },
        { name: 'rock-and-roll', src: gbcRockAndRoll },
        { name: 'scratching-head', src: gbcScratchingHead },
        { name: 'heart-gesture', src: gbcHeartGesture },
        { name: 'silent', src: gbcSilent },
        { name: 'teary-eyes', src: gbcTearyEyes },
        { name: 'sweating', src: gbcSweating },
        { name: 'offering-flowers', src: gbcOfferingFlowers },
        { name: 'angry', src: gbcAngry },
        { name: 'deep-sleep', src: gbcDeepSleep },
        { name: 'box-head', src: gbcBoxHead },
        { name: 'confident', src: gbcConfident },
        { name: 'being-pulled', src: gbcBeingPulled },
        { name: 'depressed', src: gbcDepressed },
        { name: 'showing-teeth', src: gbcShowingTeeth }
    ],
    'MyGO': [
        { name: 'block', src: mygoBlock },
        { name: 'love', src: mygoLove },
        { name: 'no-way', src: mygoNoWay },
        { name: 'no-fighting', src: mygoNoFighting },
        { name: 'why', src: mygoWhy },
        { name: 'just-woke-up', src: mygoJustWokeUp },
        { name: 'creating', src: mygoCreating },
        { name: 'sending-message', src: mygoSendingMessage },
        { name: 'huh', src: mygoHuh },
        { name: 'crying-loudly', src: mygoCryingLoudly },
        { name: 'shy', src: mygoShy },
        { name: 'melancholy', src: mygoMelancholy },
        { name: 'matcha-parfait', src: mygoMatchaParfait },
        { name: 'peeking', src: mygoPeeking },
        { name: 'interesting-woman', src: mygoInterestingWoman },
        { name: 'running-away', src: mygoRunningAway },
        { name: 'angry', src: mygoAngry },
        { name: 'let-me-see', src: mygoLetMeSee },
        { name: 'please-order', src: mygoPleaseOrder },
        { name: 'what-about-me', src: mygoWhatAboutMe }
    ]
};

// 获取所有图片
const getAllImages = (): Array<{ category: string; name: string; src: string }> => {
    const allImages: Array<{ category: string; name: string; src: string }> = [];

    Object.entries(imageCategories).forEach(([category, images]) => {
        images.forEach(image => {
            allImages.push({
                category,
                name: image.name,
                src: image.src
            });
        });
    });

    return allImages;
};

// 获取随机图片
const getRandomImage = (): { category: string; name: string; src: string } => {
    const allImages = getAllImages();
    const randomIndex = Math.floor(Math.random() * allImages.length);
    return allImages[randomIndex];
};

export const PreviewPlaceholder: React.FC<PreviewPlaceholderProps> = ({ onReopenPreview, isReopening = false }) => {
    const [randomImage, setRandomImage] = useState<{ category: string; name: string; src: string } | null>(null);
    const [imageError, setImageError] = useState(false);

    useEffect(() => {
        // 组件挂载时随机选择一张图片
        const selectedImage = getRandomImage();
        setRandomImage(selectedImage);
        setImageError(false); // 重置错误状态
        console.log('🎨 Selected random image:', selectedImage);
    }, []);

    const handleImageError = () => {
        console.warn('🖼️ Failed to load image:', randomImage?.src);
        setImageError(true);
    };

    const handleImageLoad = () => {
        console.log('🖼️ Image loaded successfully:', randomImage?.src);
    };

    return (
        <div className="preview-placeholder">
            <div className="placeholder-content">
                <div className="placeholder-icon">
                    {randomImage && !imageError ? (
                        <img
                            src={randomImage.src}
                            alt="预览已关闭"
                            className="placeholder-image"
                            onError={handleImageError}
                            onLoad={handleImageLoad}
                        />
                    ) : (
                        // 备用图标，当图片加载失败时显示
                        <div className="placeholder-fallback-icon">
                            <svg width="128" height="128" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z" />
                            </svg>
                        </div>
                    )}
                </div>
                <h3>预览编辑器已关闭</h3>
                <p>您可以点击下面的按钮重新打开预览编辑器</p>
                <button
                    className="reopen-preview-button"
                    onClick={onReopenPreview}
                    disabled={isReopening}
                >
                    {isReopening ? '正在打开预览编辑器...' : '重新打开预览编辑器'}
                </button>
                <div className="placeholder-tips">
                    <p>💡 提示：</p>
                    <ul>
                        <li>预览编辑器会实时显示格式化效果</li>
                        <li>配置更改会立即应用到预览中</li>
                    </ul>
                </div>
                {imageError && randomImage && (
                    <div className="debug-info">
                        <small>图片加载失败: {randomImage.name}</small>
                    </div>
                )}
            </div>
        </div>
    );
};
