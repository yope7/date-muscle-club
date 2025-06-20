"use client";

import React, { useState, useEffect, useRef } from "react";
import { Box, Typography, useTheme, useMediaQuery } from "@mui/material";

interface NumberPickerProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  allowEmpty?: boolean;
}

export const NumberPicker = ({
  value,
  onChange,
  min = 0,
  max = 150,
  step = 0.5,
  unit = "kg",
  allowEmpty = false,
}: NumberPickerProps) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [isDragging, setIsDragging] = useState(false);
  const [startY, setStartY] = useState(0);
  const [startValue, setStartValue] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // 数値の選択肢を生成
  // 少数は1桁まで
  const numbers = allowEmpty
    ? [
        0,
        ...Array.from({ length: Math.floor((max - min) / step) + 1 }, (_, i) =>
          parseFloat((min + i * step).toFixed(1))
        ),
      ]
    : Array.from({ length: Math.floor((max - min) / step) + 1 }, (_, i) =>
        parseFloat((min + i * step).toFixed(1))
      );

  // 現在の値のインデックスを取得（最も近い値を使用）
  const getCurrentIndex = (val: number) => {
    return numbers.findIndex((n) => n >= val) || 0;
  };

  const currentIndex = getCurrentIndex(value);

  // 表示する数値の範囲を計算（現在の値の前後2つずつ）
  const visibleNumbers = numbers.slice(
    Math.max(0, currentIndex - 2),
    Math.min(numbers.length, currentIndex + 3)
  );

  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true);
    setStartY(e.touches[0].clientY);
    setStartValue(value);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;

    const deltaY = startY - e.touches[0].clientY;
    const deltaValue = Math.round(deltaY / 10);
    const rawValue = Math.max(0, startValue + deltaValue);
    // ステップ刻みの最も近い値にスナップ
    const snappedValue = parseFloat(
      (Math.round(rawValue / step) * step).toFixed(1)
    );
    onChange(snappedValue);
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setStartY(e.clientY);
    setStartValue(value);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;

    const deltaY = startY - e.clientY;
    const deltaValue = Math.round(deltaY / 10);
    const rawValue = Math.max(0, startValue + deltaValue);
    // ステップ刻みの最も近い値にスナップ
    const snappedValue = parseFloat(
      (Math.round(rawValue / step) * step).toFixed(1)
    );
    onChange(snappedValue);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowUp") {
      e.preventDefault();
      const newValue = parseFloat(Math.min(max, value + step).toFixed(1));
      onChange(newValue);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      const newValue = parseFloat(Math.max(min, value - step).toFixed(1));
      onChange(newValue);
    }
  };

  const handleClick = (number: number) => {
    onChange(number);
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = Math.sign(e.deltaY) * -1;
      const rawValue = Math.max(0, value + delta * step);
      // ステップ刻みの最も近い値にスナップ
      const snappedValue = parseFloat(
        (Math.round(rawValue / step) * step).toFixed(1)
      );
      onChange(snappedValue);
    };

    container.addEventListener("wheel", handleWheel, { passive: false });
    return () => container.removeEventListener("wheel", handleWheel);
  }, [value, onChange, step]);

  return (
    <Box
      ref={containerRef}
      sx={{
        height: isMobile ? 120 : 150,
        overflow: "hidden",
        position: "relative",
        cursor: "ns-resize",
        userSelect: "none",
        touchAction: "none",
        bgcolor: theme.palette.background.paper,
        borderRadius: 1,
        border: `1px solid ${theme.palette.divider}`,
        "&::before, &::after": {
          content: '""',
          position: "absolute",
          left: 0,
          right: 0,
          height: "40%",
          pointerEvents: "none",
          zIndex: 1,
        },
        "&::before": {
          top: 0,
          background: `linear-gradient(to bottom, ${theme.palette.background.paper}, transparent)`,
        },
        "&::after": {
          bottom: 0,
          background: `linear-gradient(to top, ${theme.palette.background.paper}, transparent)`,
        },
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          py: 1,
        }}
      >
        {visibleNumbers.map((number) => (
          <Typography
            key={number}
            variant={isMobile ? "h6" : "h5"}
            onClick={() => handleClick(number)}
            sx={{
              my: 0.5,
              opacity: number === value ? 1 : 0.3,
              transform: `scale(${number === value ? 1 : 0.8})`,
              transition: "all 0.2s ease",
              fontWeight: number === value ? "bold" : "normal",
              color: number === value ? theme.palette.primary.main : "inherit",
              cursor: "pointer",
              "&:hover": {
                opacity: 0.8,
              },
            }}
          >
            {number === 0 && allowEmpty ? "選択なし" : `${number}${unit}`}
          </Typography>
        ))}
      </Box>
    </Box>
  );
};
