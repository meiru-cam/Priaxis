/**
 * Pixel Progress Bar Component
 * 
 * A pixel art progress bar with character sprite pushing blocks.
 * Character pushes rainbow block from left; at 100% moves to right celebrating.
 */

import React from 'react';
import styled, { keyframes } from 'styled-components';

// Sprite paths
const CHARACTER_SPRITE = '/assets/sprites/farmer-character.png';
const BLOCKS_SPRITE = '/assets/sprites/progress-blocks.png';

interface PixelProgressBarProps {
    /** Completed count */
    value: number;
    /** Total count */
    max?: number;
    /** Show label text */
    showLabel?: boolean;
    /** Size variant */
    size?: 'small' | 'medium' | 'large';
    /** Custom label text */
    label?: string;
}

// Animations
const pushMotion = keyframes`
    0%, 100% { transform: translateX(0); }
    50% { transform: translateX(2px); }
`;

const celebrateMotion = keyframes`
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-4px); }
`;

// Container
const Container = styled.div`
    width: 100%;
    margin: 8px 0;
`;

const LabelRow = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 4px;
`;

const Label = styled.span`
    font-size: 0.75rem;
    color: ${({ theme }) => theme?.colors?.text?.tertiary || '#888'};
`;

const Percent = styled.span`
    font-size: 0.75rem;
    font-weight: 600;
    color: ${({ theme }) => theme?.colors?.text?.secondary || '#666'};
`;

// Track that holds all elements - inline-flex to fit content
const Track = styled.div<{ $size: string }>`
    display: inline-flex;
    align-items: center;
    gap: 2px;
    padding: 6px 8px;
    background: linear-gradient(to bottom, 
        ${({ theme }) => theme?.colors?.bg?.tertiary || '#f5f5f5'} 0%,
        ${({ theme }) => theme?.colors?.bg?.secondary || '#e8e8e8'} 100%
    );
    border: 2px solid ${({ theme }) => theme?.colors?.border?.primary || '#c0c0c0'};
    border-radius: 8px;
    min-height: ${props => props.$size === 'small' ? '36px' : props.$size === 'large' ? '56px' : '44px'};
    box-shadow: inset 0 1px 0 rgba(255,255,255,0.8),
                inset 0 -1px 0 rgba(0,0,0,0.1);
`;

// Block using sprite background
const SpriteBlock = styled.div<{ $type: 'filled' | 'rainbow' | 'empty'; $size: string }>`
    width: ${props => props.$size === 'small' ? '18px' : props.$size === 'large' ? '32px' : '24px'};
    height: ${props => props.$size === 'small' ? '24px' : props.$size === 'large' ? '42px' : '32px'};
    background-image: url(${BLOCKS_SPRITE});
    background-size: auto 300%;
    background-repeat: no-repeat;
    image-rendering: pixelated;
    image-rendering: crisp-edges;
    flex-shrink: 0;
    
    /* Sprite positions: filled=top, rainbow=middle, empty=bottom */
    background-position: center ${props => {
        switch (props.$type) {
            case 'filled': return '0%';
            case 'rainbow': return '50%';
            case 'empty': return '100%';
        }
    }};
`;

// Character sprite
const CharacterSprite = styled.div<{ $pose: 0 | 1 | 2; $isComplete: boolean; $size: string }>`
    width: ${props => props.$size === 'small' ? '26px' : props.$size === 'large' ? '44px' : '34px'};
    height: ${props => props.$size === 'small' ? '32px' : props.$size === 'large' ? '54px' : '42px'};
    background-color: transparent;
    background-image: url(${CHARACTER_SPRITE});
    background-size: 300% auto;
    background-repeat: no-repeat;
    image-rendering: pixelated;
    image-rendering: crisp-edges;
    flex-shrink: 0;
    
    /* Sprite positions: 3 poses in horizontal strip */
    background-position: ${props => props.$pose * 50}% center;
    
    animation: ${props => props.$isComplete ? celebrateMotion : pushMotion} 0.5s ease-in-out infinite;
`;


export const PixelProgressBar: React.FC<PixelProgressBarProps> = ({
    value,
    max = 5,
    showLabel = true,
    size = 'small',
    label,
}) => {
    const completed = Math.min(value, max);
    const remaining = max - completed;
    const percent = max > 0 ? Math.round((completed / max) * 100) : 0;
    const isComplete = completed >= max;

    return (
        <Container>
            {/* Label and percentage above */}
            {(label || showLabel) && (
                <LabelRow>
                    <Label>{label || ''}</Label>
                    <Percent>{percent}%</Percent>
                </LabelRow>
            )}

            <Track $size={size}>
                {/* Filled blocks (completed) */}
                {Array.from({ length: completed }).map((_, i) => (
                    <SpriteBlock
                        key={`filled-${i}`}
                        $type="filled"
                        $size={size}
                    />
                ))}

                {/* Character pushing (between filled and rainbow) */}
                {!isComplete && (
                    <CharacterSprite
                        $pose={0}
                        $isComplete={false}
                        $size={size}
                    />
                )}

                {/* Rainbow block (next one to push) */}
                {!isComplete && remaining > 0 && (
                    <SpriteBlock $type="rainbow" $size={size} />
                )}

                {/* Empty blocks (remaining after rainbow) */}
                {Array.from({ length: Math.max(0, remaining - 1) }).map((_, i) => (
                    <SpriteBlock
                        key={`empty-${i}`}
                        $type="empty"
                        $size={size}
                    />
                ))}

                {/* Character celebrating at the end when complete */}
                {isComplete && (
                    <CharacterSprite
                        $pose={2}
                        $isComplete={true}
                        $size={size}
                    />
                )}
            </Track>
        </Container>
    );
};

export default PixelProgressBar;
