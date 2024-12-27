//****************************************************************************** 
// Cached set of motion parameters that can be used to efficiently update 
// multiple springs using the same time step, angular frequency, and damping 
// ratio. 
//****************************************************************************** 
export class DampedSpringMotionParams {
    posPosCoef: number = 0; // newPos = posPosCoef * oldPos + posVelCoef * oldVel
    posVelCoef: number = 0;
    velPosCoef: number = 0; // newVel = velPosCoef * oldPos + velVelCoef * oldVel
    velVelCoef: number = 0;
}

//****************************************************************************** 
// This function computes the parameters needed to simulate a damped spring 
// over a given period of time. 
// - An angular frequency controls how fast the spring oscillates. 
// - A damping ratio controls how fast the motion decays. 
//     damping ratio > 1: over damped 
//     damping ratio = 1: critically damped 
//     damping ratio < 1: under damped 
//****************************************************************************** 
export function calcDampedSpringMotionParams(
    deltaTime: number,         // time step to advance
    angularFrequency: number,  // angular frequency of motion
    dampingRatio: number       // damping ratio of motion
): DampedSpringMotionParams {
    const epsilon = 0.0001;
    const params = new DampedSpringMotionParams();

    // Force values into legal range
    if (dampingRatio < 0.0) dampingRatio = 0.0;
    if (angularFrequency < 0.0) angularFrequency = 0.0;

    // If there is no angular frequency, the spring will not move
    if (angularFrequency < epsilon) {
        params.posPosCoef = 1.0;
        params.posVelCoef = 0.0;
        params.velPosCoef = 0.0;
        params.velVelCoef = 1.0;
        return params;
    }

    if (dampingRatio > 1.0 + epsilon) {
        // Over-damped
        const za = -angularFrequency * dampingRatio;
        const zb = angularFrequency * Math.sqrt(dampingRatio * dampingRatio - 1.0);
        const z1 = za - zb;
        const z2 = za + zb;

        const e1 = Math.exp(z1 * deltaTime);
        const e2 = Math.exp(z2 * deltaTime);

        const invTwoZb = 1.0 / (2.0 * zb); // = 1 / (z2 - z1)

        const e1_Over_TwoZb = e1 * invTwoZb;
        const e2_Over_TwoZb = e2 * invTwoZb;

        const z1e1_Over_TwoZb = z1 * e1_Over_TwoZb;
        const z2e2_Over_TwoZb = z2 * e2_Over_TwoZb;

        params.posPosCoef = e1_Over_TwoZb * z2 - z2e2_Over_TwoZb + e2;
        params.posVelCoef = -e1_Over_TwoZb + e2_Over_TwoZb;

        params.velPosCoef = (z1e1_Over_TwoZb - z2e2_Over_TwoZb + e2) * z2;
        params.velVelCoef = -z1e1_Over_TwoZb + z2e2_Over_TwoZb;
    } else if (dampingRatio < 1.0 - epsilon) {
        // Under-damped
        const omegaZeta = angularFrequency * dampingRatio;
        const alpha = angularFrequency * Math.sqrt(1.0 - dampingRatio * dampingRatio);

        const expTerm = Math.exp(-omegaZeta * deltaTime);
        const cosTerm = Math.cos(alpha * deltaTime);
        const sinTerm = Math.sin(alpha * deltaTime);

        const invAlpha = 1.0 / alpha;

        const expSin = expTerm * sinTerm;
        const expCos = expTerm * cosTerm;
        const expOmegaZetaSin_Over_Alpha = expTerm * omegaZeta * sinTerm * invAlpha;

        params.posPosCoef = expCos + expOmegaZetaSin_Over_Alpha;
        params.posVelCoef = expSin * invAlpha;

        params.velPosCoef = -expSin * alpha - omegaZeta * expOmegaZetaSin_Over_Alpha;
        params.velVelCoef = expCos - expOmegaZetaSin_Over_Alpha;
    } else {
        // Critically damped
        const expTerm = Math.exp(-angularFrequency * deltaTime);
        const timeExp = deltaTime * expTerm;
        const timeExpFreq = timeExp * angularFrequency;

        params.posPosCoef = timeExpFreq + expTerm;
        params.posVelCoef = timeExp;

        params.velPosCoef = -angularFrequency * timeExpFreq;
        params.velVelCoef = -timeExpFreq + expTerm;
    }

    return params;
}

//****************************************************************************** 
// This function updates the supplied position and velocity values based on 
// the motion parameters. 
//****************************************************************************** 
export function updateDampedSpringMotion(
    pos: number,                  // position value to update
    vel: number,                  // velocity value to update
    equilibriumPos: number,       // position to approach
    params: DampedSpringMotionParams // motion parameters to use
): { pos: number; vel: number } {
    const oldPos = pos - equilibriumPos; // update in equilibrium relative space
    const oldVel = vel;

    const newPos = oldPos * params.posPosCoef + oldVel * params.posVelCoef + equilibriumPos;
    const newVel = oldPos * params.velPosCoef + oldVel * params.velVelCoef;

    return { pos: newPos, vel: newVel };
}
