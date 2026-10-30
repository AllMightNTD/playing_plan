/**
 * Sinh đường dẫn điều hướng tới trang Khám phá (/explore) với bộ lọc quận được kích hoạt sẵn.
 */
export function getExploreDistrictUrl(districtKey: string): string {
  return `/explore?district=${encodeURIComponent(districtKey)}`;
}
