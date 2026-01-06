/**
 * Date Helper Functions
 * dateHelpers.js
 */

const { useState, useEffect, useMemo, useRef } = React;

// 台灣當地日期
const getTaiwanToday = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Taipei' });

// 使用全域 normalizeDate（已在 HTML head 中定義）
const normalizeDate = window.normalizeDate || ((dateStr) => {
    console.error('[ERROR] window.normalizeDate 未定義！');
    return '';
});

// 計算開始日期
const getStartDate = (endDateStr, duration) => {
    if (!duration || !endDateStr) return '';
    try {
        const end = new Date(endDateStr);
        const start = new Date(end);
        start.setDate(end.getDate() - duration);
        return start.toLocaleDateString('en-CA', { timeZone: 'Asia/Taipei' });
    } catch (e) {
        return '';
    }
};
