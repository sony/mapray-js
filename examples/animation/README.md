# animation-samples

## [liner](./liner)
An animation using KFLinerCurve to change pin size and color.
On the KFLinearCurve, bind size and bg_color to animate the size and color of the PinEntity linearly.

## [step](./step) 
An animation using KFStepCurve to change pin size and color.
In the KFStepCurve, bind size and bg_color to animate the size and color of the PinEntity into a stepped shape.

## [size](./size)
Animation that uses a subclass of Curve to change the pin size.
I have written my own curve called CosCurve that returns the value of the cosine function.
The subclass getInvariance gives an infinite Curve setting.
Animate in CosCurve for the size of PinEntity.

## [updown](./updown)
Reposition animation using a subclass of ComboVectorCurve, ConstantCurve and Curve.
The pin moves up and down in the sky above where you click the ground plane.
I have written my own Curve that returns the value of the cosine function CosCurveWithTime.
The operation time is set by getInvariance of the subclass.
Create a vector3 combo Curve with ComboVectorCurve.
The first element is set to ConstantCurve as the longitude of the ground position you clicked.
Second element sets the latitude of the ground position you clicked to ConstantCurve.
The third element is set to CosCurve.
This is an example of animating the elevation of a PinEntity with the value of CosCurve by binding the ComboVectorCurve to the position of the PinEntity.

## [countup](./countup)
Animation using subclasses of Curve to modify text.
Click the ground plane to create a pin at that location, and the number counts up in the text.
We are creating a Curve that returns the value of the cosine function CosCurveText as a String.
It is a curve setting that works indefinitely with the subclass getInvariance.
Animate the PinEntity text in CosCurve.


## [path](./path)
This is the PathEntity and TextEntity animation using the EasyBindingBlock.
EasyBinding animates the length of the Path and the character of the text, and the position of the Pin and text.
It registers a numeric animation with the identifier length and sets the parameters for each entity in its parameterization function.
Curve is a KFLinearCurve, using 0 to 30 as linear values in 30 seconds.
