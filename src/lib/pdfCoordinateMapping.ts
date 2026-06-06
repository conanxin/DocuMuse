export type PdfCoordinateSystem = "viewport_top_left" | "pdf_bottom_left" | "unknown";

export type PdfBoundingBoxInput = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type PdfViewportBox = {
  left: number;
  top: number;
  width: number;
  height: number;
};

export type PdfCoordinateMappingResult = {
  box: PdfViewportBox | null;
  warning?: string;
};

export function convertBoundingBoxToViewportBox({
  boundingBox,
  viewportWidth,
  viewportHeight,
  pageWidth,
  pageHeight,
  coordinateSystem = "unknown",
  minWidth = 8,
  minHeight = 8
}: {
  boundingBox: PdfBoundingBoxInput;
  viewportWidth: number;
  viewportHeight: number;
  pageWidth?: number;
  pageHeight?: number;
  coordinateSystem?: PdfCoordinateSystem;
  minWidth?: number;
  minHeight?: number;
}): PdfCoordinateMappingResult {
  const values = [boundingBox.x, boundingBox.y, boundingBox.width, boundingBox.height, viewportWidth, viewportHeight];
  if (values.some((value) => !Number.isFinite(value))) {
    return { box: null, warning: "坐标包含无效数值，已跳过高亮。" };
  }

  if (boundingBox.width <= 0 || boundingBox.height <= 0 || viewportWidth <= 0 || viewportHeight <= 0) {
    return { box: null, warning: "坐标尺寸无效，已跳过高亮。" };
  }

  const sourceWidth = pageWidth && pageWidth > 0 ? pageWidth : viewportWidth;
  const sourceHeight = pageHeight && pageHeight > 0 ? pageHeight : viewportHeight;
  const scaleX = viewportWidth / sourceWidth;
  const scaleY = viewportHeight / sourceHeight;

  let left = boundingBox.x * scaleX;
  let top = boundingBox.y * scaleY;
  let width = boundingBox.width * scaleX;
  let height = boundingBox.height * scaleY;
  let warning: string | undefined;

  if (coordinateSystem === "pdf_bottom_left") {
    top = viewportHeight - (boundingBox.y + boundingBox.height) * scaleY;
  } else if (coordinateSystem === "unknown") {
    warning = "坐标系未完全确认，当前使用近似映射。";
  }

  if (left > viewportWidth || top > viewportHeight || left + width < 0 || top + height < 0) {
    return { box: null, warning: "转换后的高亮区域超出当前页面，已跳过。" };
  }

  left = clamp(left, 0, Math.max(0, viewportWidth - Math.min(minWidth, viewportWidth)));
  top = clamp(top, 0, Math.max(0, viewportHeight - Math.min(minHeight, viewportHeight)));
  width = clamp(width, Math.min(minWidth, viewportWidth), viewportWidth - left);
  height = clamp(height, Math.min(minHeight, viewportHeight), viewportHeight - top);

  if (width <= 0 || height <= 0 || left + width > viewportWidth + 0.5 || top + height > viewportHeight + 0.5) {
    return { box: null, warning: "高亮区域无法安全放入当前页面，已跳过。" };
  }

  return {
    box: {
      left,
      top,
      width,
      height
    },
    warning
  };
}

function clamp(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min;
  const safeMax = Math.max(min, max);
  return Math.max(min, Math.min(value, safeMax));
}
