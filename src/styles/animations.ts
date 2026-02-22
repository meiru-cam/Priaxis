import { keyframes } from 'styled-components';

/**
 * Animations - Migrated from CSS @keyframes
 */

// Modal animations
export const modalSlideIn = keyframes`
  from {
    opacity: 0;
    transform: translateY(-50px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
`;

export const modalFadeOut = keyframes`
  from {
    opacity: 1;
    transform: scale(1);
  }
  to {
    opacity: 0;
    transform: scale(0.95);
  }
`;

// Fade animations
export const fadeIn = keyframes`
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
`;

export const fadeOut = keyframes`
  from {
    opacity: 1;
  }
  to {
    opacity: 0;
  }
`;

// Slide animations
export const slideIn = keyframes`
  from {
    opacity: 0;
    transform: translateX(-20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
`;

export const slideUp = keyframes`
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

export const slideDown = keyframes`
  from {
    opacity: 0;
    transform: translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

// Float animation
export const floatUp = keyframes`
  0% {
    opacity: 1;
    transform: translateY(0);
  }
  100% {
    opacity: 0;
    transform: translateY(-50px);
  }
`;

// Pulse animations
export const pulse = keyframes`
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.05);
  }
`;

export const pulseAura = keyframes`
  0% {
    transform: scale(1);
    opacity: 0.4;
  }
  50% {
    transform: scale(1.1);
    opacity: 0.6;
  }
  100% {
    transform: scale(1);
    opacity: 0.4;
  }
`;

export const glowPulse = keyframes`
  0%, 100% {
    box-shadow: 0 0 5px rgba(38, 139, 210, 0.3);
  }
  50% {
    box-shadow: 0 0 20px rgba(38, 139, 210, 0.5);
  }
`;

// Shine animation
export const shine = keyframes`
  0% {
    left: -100%;
  }
  100% {
    left: 100%;
  }
`;

// Grid animation
export const gridMove = keyframes`
  0% {
    background-position: 0 0;
  }
  100% {
    background-position: 30px 30px;
  }
`;

// Gradient shift
export const gradientShift = keyframes`
  0%, 100% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
`;

// Avatar morph
export const avatarMorph = keyframes`
  0%, 100% {
    border-radius: 50%;
  }
  25% {
    border-radius: 45% 55% 55% 45%;
  }
  50% {
    border-radius: 55% 45% 45% 55%;
  }
  75% {
    border-radius: 45% 55% 50% 50%;
  }
`;

// Ritual appear
export const ritualAppear = keyframes`
  from {
    opacity: 0;
    transform: scale(0.8) translateY(20px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
`;

// Spin animation
export const spin = keyframes`
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
`;

// Bounce animation
export const bounce = keyframes`
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-10px);
  }
`;

// Shake animation
export const shake = keyframes`
  0%, 100% {
    transform: translateX(0);
  }
  10%, 30%, 50%, 70%, 90% {
    transform: translateX(-5px);
  }
  20%, 40%, 60%, 80% {
    transform: translateX(5px);
  }
`;

// Progress fill animation
export const progressFill = keyframes`
  from {
    width: 0%;
  }
`;

// Notification slide in
export const notificationSlideIn = keyframes`
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
`;

export const notificationSlideOut = keyframes`
  from {
    transform: translateX(0);
    opacity: 1;
  }
  to {
    transform: translateX(100%);
    opacity: 0;
  }
`;
