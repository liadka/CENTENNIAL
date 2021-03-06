/********************************************************************************************************
 * Name: UML to YANG Mapping Tool
 * Copyright 2015 CAICT (China Academy of Information and Communication Technology (former China Academy of Telecommunication Research)). All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License").
 *
 * This tool is developed according to the mapping rules defined in onf2015.261_Mapping_Gdls_UML-YANG.04 by OpenNetworkFoundation(ONF) IMP group.
 *
 * file: \model\yang\feature.js
 *
 * The above copyright information should be included in all distribution, reproduction or derivative works of this software.
 *
 ****************************************************************************************************/
function feature(id,name,description){
    this.id=id;
    this.name=name;
    this.description=description.toYangDescription();
    this.status;
    this.reference;
}
feature.prototype.writeNode=function(layer){
    var PRE = '';
    var k = layer;
    while (k-- > 0) {
        PRE += '\t';
    }
    var name="feature "+this.name;
    var descript="";
    if (typeof this.description == 'string') {
        this.description = this.description.replace(/\r+\n+/g, '\r\n' + PRE + '\t\t');
        descript = PRE + "\tdescription \"" + this.description + "\";\r\n"
    }
    var s = PRE + name + " {\r\n" +
        descript + PRE + "}\r\n";
    return s;
}
module.exports=feature;