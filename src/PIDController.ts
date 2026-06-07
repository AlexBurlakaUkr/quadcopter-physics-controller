export class PIDController {
  private kp: number;
  private ki: number;
  private kd: number;
  private integral: number = 0;
  private previousError: number = 0;
  private maxIntegral: number;

  constructor(kp: number, ki: number, kd: number, maxIntegral: number = 10.0) {
    this.kp = kp;
    this.ki = ki;
    this.kd = kd;
    this.maxIntegral = maxIntegral;
  }

  /**
   * Calculate the controller output.
   * @param setpoint Target value
   * @param measured Actual measured value
   * @param dt Time delta in seconds
   */
  public calculate(setpoint: number, measured: number, dt: number): number {
    if (dt <= 0) return 0;
    
    const error = setpoint - measured;

    // Proportional term
    const pOut = this.kp * error;

    // Integral term with windup protection
    this.integral += error * dt;
    this.integral = Math.max(-this.maxIntegral, Math.min(this.maxIntegral, this.integral));
    const iOut = this.ki * this.integral;

    // Derivative term
    const derivative = (error - this.previousError) / dt;
    const dOut = this.kd * derivative;

    this.previousError = error;

    return pOut + iOut + dOut;
  }

  /**
   * Reset internal error state.
   */
  public reset(): void {
    this.integral = 0;
    this.previousError = 0;
  }
}
