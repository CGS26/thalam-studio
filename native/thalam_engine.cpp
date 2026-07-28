#include <algorithm>
#include <cmath>

extern "C" {

double seconds_per_akshara(double bpm) {
  return bpm > 0.0 ? 60.0 / bpm : 0.0;
}

int akshara_index(double elapsed_seconds, double bpm, int akshara_count) {
  if (bpm <= 0.0 || akshara_count <= 0) return 0;
  const auto absolute_beat =
      static_cast<long long>(std::floor(elapsed_seconds / seconds_per_akshara(bpm)));
  return static_cast<int>(absolute_beat % akshara_count);
}

int cycle_number(double elapsed_seconds, double bpm, int akshara_count) {
  if (bpm <= 0.0 || akshara_count <= 0) return 1;
  const double duration = seconds_per_akshara(bpm) * akshara_count;
  return static_cast<int>(std::floor(elapsed_seconds / duration)) + 1;
}

double clipped_duration(double sample_duration, double slot_duration,
                        int overflow_mode) {
  // 0 = let ring, 1 = mute, 2 = trim to slot.
  if (overflow_mode == 1) return 0.0;
  if (overflow_mode == 2) return std::min(sample_duration, slot_duration);
  return sample_duration;
}

}
